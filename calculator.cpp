#include <iostream>
#include <string>
#include <vector>
#include <array>
#include <set>
#include <memory>
#include <utility>
#include <algorithm>
#include <tuple>
#include <random>

#include <cstdint>
#include <cassert>
#include <cmath>

#include "emscripten.h"
#include "emscripten/val.h"
#include "emscripten/bind.h"
#include "emscripten/wire.h"

constexpr double G = 6.67408e-3;

// #define __debug_log;
// #define __use_twice_ite

double fast_invsqrt(double number) {
	double y = number;
	double x2 = y * 0.5;
	int64_t i = *(int64_t *) & y;
	i = 0x5fe6eb50c7b537a9 - (i >> 1);
	y = *(double *) &i;
	y = y * (1.5 - (x2 * y * y));   // 1st iteration
	#ifdef __use_twice_ite
	y = y * (1.5 - (x2 * y * y));   // 2nd iteration, this can be removed
	#endif
	return y;
}

struct Particle {

	struct Vector2 {
		inline static Vector2 unit(double x, double y) {
			// double dvd = sqrt(x * x + y * y);
			double dvd = fast_invsqrt(x * x + y * y);
			return Vector2(x * dvd, y * dvd);
		}
		Vector2() : x(0), y(0) {}
		Vector2(double x, double y) : x(x), y(y) {}

		double x;
		double y;

		inline double distance_pow_2(Vector2 v_other) const {
			return (x - v_other.x) * (x - v_other.x) + (y - v_other.y) * (y - v_other.y);
		}

		inline Vector2 &multiply(double f) {
			x *= f;
			y *= f;
			return *this;
		}
	};

	inline double roche_limit_pow_2(const Particle &p_other) const {
		// 洛希极限: ((R1 + R2) * 2.423) * (density1 / density2) ^ (1/3)
		return (radius + p_other.radius) * (radius + p_other.radius) * 5.870929;
	}

	Vector2 position;
	Vector2 velocity;
	Vector2 acceleration;

	double mass;
	double radius;

	Particle(double px, double py, double vx, double vy, double ax, double ay, double m, double r) {
		position.x = px;
		position.y = py;
		velocity.x = vx;
		velocity.y = vy;
		acceleration.x = ax;
		acceleration.y = ay;
		mass = m;
		radius = r;
	}
};

template <typename It>
inline std::vector<std::pair<It, It>> chunk(It range_from, It range_to, const std::ptrdiff_t num) {
	// Aliases, to make the rest of the code more readable.
	using std::distance;
	using std::make_pair;
	using std::pair;
	using std::vector;
	using diff_t = std::ptrdiff_t;

	// Total item number and portion size.
	const diff_t total { distance(range_from, range_to) };
	const diff_t portion { total / num };

	vector<pair<It, It>> chunks(num);

	It portion_end{range_from};

	// Use the 'generate' algorithm to create portions.
	std::generate(begin(chunks), end(chunks), [&portion_end, portion]() {
		It portion_start { portion_end };

		portion_end += portion;
		return make_pair(portion_start, portion_end);
	});

	// The last portion's end must always be 'range_to'.
	chunks.back().second = range_to;

	return chunks;
}

/**
 *
 * Main.
 *
 */
int main(int argc, char **argv) {
	printf("wasm ready.\n");
	return 0;
}

// from JS TypedArray<Float64> -> std::unique_ptr -> std::move
std::tuple<std::unique_ptr<double[]>, uint32_t> get_double_arr_from_js(emscripten::val arr) {
	auto module = emscripten::val::global("Module");
	const uint32_t _len = arr["length"].as<uint32_t>();
	std::unique_ptr<double[]> data(new double[_len]);
	int _destination = (int)(data.get()) / sizeof(double);
	module["HEAPF64"].call<emscripten::val>("set", arr, emscripten::val(_destination));
	return std::make_tuple(std::move(data), _len);
}

// 使用 typed_memory_view 转移 double[] 的所有权
inline emscripten::val send_array_fast_double(double *arr, int len) {
	// std::cout << "fast f64 out arr: " << arr << " len: " << len << std::endl;
	return emscripten::val(emscripten::typed_memory_view(len, arr));
}
inline emscripten::val send_array_fast_uint32(const uint32_t *arr, int len) {
	return emscripten::val(emscripten::typed_memory_view(len, arr));
}

emscripten::val calculating_particle_devour(emscripten::val rec_arr) {
	#ifdef __debug_log
	std::cout << "calculating_particle_devour enter." << std::endl;
	#endif

	auto arr_procd = get_double_arr_from_js(rec_arr);
	auto _len = std::get<1>(arr_procd);
	auto data = std::move(std::get<0>(arr_procd));

	const int my_index = (int)data[0];
	const int total = (int)data[1];
	// const int type = (int)data[2];

	std::vector<Particle> particles;

	for (uint32_t i = 3; i < _len - 8; i += 8) {
		particles.emplace_back(Particle(data[i], data[i + 1], data[i + 2], data[i + 3], data[i + 4], data[i + 5], data[i + 6], data[i + 7]));
	}

	data.reset();

	auto pieced_particles = chunk(particles.begin(), particles.end(), total);
	const uint32_t piece_max_length = (uint32_t)std::distance(pieced_particles[0].first, pieced_particles[0].second);

	if (pieced_particles.size() < my_index + 1) {
		return emscripten::val::global("Uint32Array").new_(0);
	}

	auto my_load = std::vector<Particle>(pieced_particles[my_index].first, pieced_particles[my_index].second);

	#ifdef __debug_log
	std::cout << "cpp worker dv[" << my_index << "] total length: " << particles.size() << " load length: " << my_load.size() << std::endl;
	#endif

	auto ret_uint32_vec = std::basic_string<uint32_t>(particles.size() * 2, 4294967295U);

	uint32_t set_index = 0;
	auto will_have_been_devoured = std::set<uint32_t>();

	for (uint32_t index_in_my_load = 0; index_in_my_load < my_load.size(); index_in_my_load++) {

		auto food_candidate_indexs = std::vector<uint32_t>();

		for (uint32_t index_in_all = 0; index_in_all < particles.size(); index_in_all++) {
			const Particle &p = my_load[index_in_my_load];
			const Particle &p_other = particles[index_in_all];

			if (p.mass < p_other.mass) continue;
			if (index_in_all == (piece_max_length * my_index + index_in_my_load)) continue;

			bool can_eat = (
				p.position.distance_pow_2(p_other.position) <= p.roche_limit_pow_2(p_other) &&
				will_have_been_devoured.count(index_in_all) == 0
			);

			if (can_eat) {
				food_candidate_indexs.push_back(index_in_all);
				will_have_been_devoured.insert(index_in_all);
			}
		}

		if (food_candidate_indexs.size() > 0) {
			ret_uint32_vec[set_index++] = 4294967294;
			ret_uint32_vec[set_index++] = piece_max_length * my_index + index_in_my_load;
			for (auto fc : food_candidate_indexs) {
				ret_uint32_vec[set_index++] = fc;
			}
		}

		// set_index+= food_candidate_indexs.size() + 2;
	}

	will_have_been_devoured.clear();

	#ifdef __debug_log
	std::cout << "calculating_particle_devour will leave, set_index is " << set_index << " ." << std::endl;
	#endif

	return send_array_fast_uint32(ret_uint32_vec.data(), set_index + 1);
}

emscripten::val calculating_universal_gravitation(emscripten::val rec_arr) {
	#ifdef __debug_log
	std::cout << "calculating_universal_gravitation enter." << std::endl;
	#endif

	auto arr_procd = get_double_arr_from_js(rec_arr);
	auto _len = std::get<1>(arr_procd);
	auto data = std::move(std::get<0>(arr_procd));

	const int my_index = (int)data[0];
	const int total = (int)data[1];
	// const int type = (int)data[2];

	std::vector<Particle> particles;

	for (uint32_t i = 3; i < _len - 8; i += 8) {
		Particle p(data[i], data[i + 1], data[i + 2], data[i + 3], data[i + 4], data[i + 5], data[i + 6], data[i + 7]);
		particles.emplace_back(p);
	}

	data.reset();

	auto pieced_particles = chunk(particles.begin(), particles.end(), total);
	const uint32_t piece_max_length = (uint32_t)std::distance(pieced_particles[0].first, pieced_particles[0].second);

	if (pieced_particles.size() < my_index + 1) {
		return emscripten::val::global("Float64Array").new_(0);
	}

	auto my_load = std::vector<Particle>(pieced_particles[my_index].first, pieced_particles[my_index].second);
	uint32_t my_load_length = my_load.size();

	#ifdef __debug_log
	std::cout << "cpp worker ug[" << my_index << "] total length: " << particles.size() << " load length: " << my_load_length << std::endl;
	#endif

	auto ret_f64_str = std::vector<double>(3 * my_load_length);

	for (uint32_t index_in_my_load = 0; index_in_my_load < my_load_length; index_in_my_load++) {

		Particle::Vector2 acc;

		for (uint32_t index_in_all = 0; index_in_all < particles.size(); index_in_all++) {

			if (index_in_all == (piece_max_length * my_index + index_in_my_load)) continue;

			const Particle &cv = particles[index_in_all];
			const Particle &p = my_load[index_in_my_load];

			double grav_acc = G * cv.mass * 1000.0 / cv.position.distance_pow_2(p.position);
			auto grav_vec = Particle::Vector2::unit(cv.position.x - p.position.x, cv.position.y - p.position.y).multiply(grav_acc);
			acc.x += grav_vec.x;
			acc.y += grav_vec.y;
		}

		ret_f64_str[index_in_my_load * 3] = piece_max_length * my_index + index_in_my_load;
		ret_f64_str[index_in_my_load * 3 + 1] = acc.x;
		ret_f64_str[index_in_my_load * 3 + 2] = acc.y;
	}

	// std::cout << "before ret, my_load.size()" << my_load_length << std::endl;

	#ifdef __debug_log
	std::cout << "calculating_universal_gravitation will leave." << std::endl;
	#endif

	return send_array_fast_double(ret_f64_str.data(), 3 * my_load_length);
}

void test_fast_invsqrt(uint32_t loop_count) {
	std::random_device RD;
	std::mt19937_64 MT64(RD());
	std::uniform_real_distribution<double> URDD{ 10.0, 10000.0 };
	for (uint32_t i = 0; i < loop_count; i++) {
		auto t = URDD(MT64);
		std::cout << t << " 1/sys::sqrt " << 1.0 / sqrt(t) << " fast_invsqrt " << fast_invsqrt(t) << std::endl;
	}
}

EMSCRIPTEN_BINDINGS(my_module) {
	emscripten::function("_calculating_particle_devour", &calculating_particle_devour, emscripten::allow_raw_pointers());
	emscripten::function("_calculating_universal_gravitation", &calculating_universal_gravitation, emscripten::allow_raw_pointers());
	emscripten::function("_test_fast_invsqrt", &test_fast_invsqrt);
}
