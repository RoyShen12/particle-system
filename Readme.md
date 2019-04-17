# discription
+ A web page demo to simulating multiple particles with mass, velocity, accleration and gravitation between each other just like a 2D universe.  
+ for the purpose of trying the Web Worker & Web Assembly functions and Mesuring how much they can actually accelerate to on web pages.
# performance
+ All of your computer CPU cores will be used for calculating the universal gravitation of each two particles and checking whether one particle can devour a paiticle which is much lighter than self and getting too close.  
+ Applying Web Worker & Web Assembly will accelerate to more than 400% (Intel i5-8500 6C, Windows 10, Chrome 73.0 stable).
+ Wasm module is written in pure modern C++.
+ For getting the best performance, the data transporting from C++ module to Javascript is passed by raw-memory-view, which is hundreds of time faster than passing an emscripten::val::array.
+ data transportation from Javascript to C++ module also used raw-heap-memory-view and inevitable raw pointer opration for best performance.
+ changing the `<body onload="run(true)">` to `<body onload="run(false)">` to see how it works without Web Worker & Web Assembly.
# running requirements
## browser
+ tested on Chrome 70+ (fastest), Firefox 65+ (will face some text blur questions) and Edge 18.  
+ Theoretically support for all modern web browsers.
## web server
Locally open index.html can not work because of the fetch API don't support `file://` URI and can't load .wasm file.  
Pleace install and use a simple web server like serve (node.js) or SimpleHTTPServer (python).
# building (if you want to modify the .cpp file your self)
## tools
visiting [emscripten official website | installation](https://emscripten.org/docs/getting_started/downloads.html) and follow the instruction to get both the tools and environment ready.
## command
c++17 is indispensable  
```
$ ./em++ calculator.cpp -O3 -o calculator.js --bind -std=c++17
```