#include <cstddef>
#include <cstdint>
#include <limits>
#include <memory>
#include <new>
#include <string>
#include <utility>
#include <vector>

#include <rlottie.h>

namespace {
struct AnimationHandle {
  std::unique_ptr<rlottie::Animation> animation;
  std::vector<std::uint32_t> buffer;
};

bool valid_surface(std::uint32_t width, std::uint32_t height) {
  constexpr std::size_t max_pixels = 16U * 1024U * 1024U;
  return width > 0 && height > 0 &&
         width <= std::numeric_limits<std::size_t>::max() / height &&
         static_cast<std::size_t>(width) * height <= max_pixels;
}

void convert_to_canvas_rgba(std::vector<std::uint32_t>& buffer) {
  auto* bytes = reinterpret_cast<std::uint8_t*>(buffer.data());
  const std::size_t total_bytes = buffer.size() * sizeof(std::uint32_t);
  for (std::size_t index = 0; index < total_bytes; index += 4U) {
    const std::uint8_t alpha = bytes[index + 3U];
    if (alpha == 0U) continue;
    std::uint32_t red = bytes[index + 2U];
    std::uint32_t green = bytes[index + 1U];
    std::uint32_t blue = bytes[index];
    if (alpha != 255U) {
      red = (red * 255U) / alpha;
      green = (green * 255U) / alpha;
      blue = (blue * 255U) / alpha;
    }
    bytes[index] = static_cast<std::uint8_t>(red);
    bytes[index + 1U] = static_cast<std::uint8_t>(green);
    bytes[index + 2U] = static_cast<std::uint8_t>(blue);
  }
}
}  // namespace

extern "C" {
AnimationHandle* animation_create_from_json(const char* json) noexcept {
  if (json == nullptr) return nullptr;
  try {
    auto animation = rlottie::Animation::loadFromData(std::string(json), "rlottie-web", "");
    if (!animation) return nullptr;
    return new AnimationHandle{std::move(animation), {}};
  } catch (...) {
    return nullptr;
  }
}

void animation_destroy(AnimationHandle* handle) noexcept { delete handle; }

std::uint32_t animation_get_width(const AnimationHandle* handle) noexcept {
  if (handle == nullptr) return 0;
  std::size_t width = 0;
  std::size_t height = 0;
  handle->animation->size(width, height);
  return static_cast<std::uint32_t>(width);
}

std::uint32_t animation_get_height(const AnimationHandle* handle) noexcept {
  if (handle == nullptr) return 0;
  std::size_t width = 0;
  std::size_t height = 0;
  handle->animation->size(width, height);
  return static_cast<std::uint32_t>(height);
}

double animation_get_frame_rate(const AnimationHandle* handle) noexcept {
  return handle == nullptr ? 0 : handle->animation->frameRate();
}

std::uint32_t animation_get_total_frames(const AnimationHandle* handle) noexcept {
  return handle == nullptr ? 0 : static_cast<std::uint32_t>(handle->animation->totalFrame());
}

double animation_get_duration(const AnimationHandle* handle) noexcept {
  return handle == nullptr ? 0 : handle->animation->duration();
}

std::uint8_t* animation_render(
    AnimationHandle* handle,
    std::uint32_t frame,
    std::uint32_t width,
    std::uint32_t height) noexcept {
  if (handle == nullptr || !valid_surface(width, height)) return nullptr;
  try {
    handle->buffer.resize(static_cast<std::size_t>(width) * height);
    rlottie::Surface surface(handle->buffer.data(), width, height, width * 4U);
    handle->animation->renderSync(frame, surface);
    convert_to_canvas_rgba(handle->buffer);
    return reinterpret_cast<std::uint8_t*>(handle->buffer.data());
  } catch (...) {
    return nullptr;
  }
}
}
