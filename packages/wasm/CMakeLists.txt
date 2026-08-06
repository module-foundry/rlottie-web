cmake_minimum_required(VERSION 3.24)
project(rlottie_web_wasm LANGUAGES C CXX ASM)

set(BUILD_SHARED_LIBS OFF CACHE BOOL "" FORCE)
set(LOTTIE_MODULE OFF CACHE BOOL "" FORCE)
set(LOTTIE_THREAD OFF CACHE BOOL "" FORCE)
set(LOTTIE_CACHE OFF CACHE BOOL "" FORCE)
set(LOTTIE_TEST OFF CACHE BOOL "" FORCE)
set(LOTTIE_EXAMPLE OFF CACHE BOOL "" FORCE)

add_subdirectory(vendor/rlottie EXCLUDE_FROM_ALL)
add_executable(rlottie-wasm src/bridge.cpp)
target_compile_features(rlottie-wasm PRIVATE cxx_std_17)
target_compile_options(rlottie-wasm PRIVATE -O3 -flto)
target_link_libraries(rlottie-wasm PRIVATE rlottie)
target_link_options(
  rlottie-wasm
  PRIVATE
    -O3
    -flto
    -sALLOW_MEMORY_GROWTH=1
    -sENVIRONMENT=worker
    -sFILESYSTEM=0
    -sMODULARIZE=1
    -sEXPORT_ES6=1
    -sEXPORT_NAME=createRLottieModule
    -sEXPORTED_FUNCTIONS=[_malloc,_free,_animation_create_from_json,_animation_destroy,_animation_get_width,_animation_get_height,_animation_get_frame_rate,_animation_get_total_frames,_animation_get_duration,_animation_render]
    -sEXPORTED_RUNTIME_METHODS=[stringToUTF8,lengthBytesUTF8,HEAPU8]
)
set_target_properties(rlottie-wasm PROPERTIES SUFFIX ".js")
