# The compiled picture must describe TODAY'S programme and pinned interpreter.
# A normal Jekyll/CI build needs no browser; it verifies the checked-in output.
require 'digest'
require 'json'

module CompiledInk
  def self.signature(scene, pin)
    grows = scene['grows'] || {}
    Digest::SHA256.hexdigest([
      scene.fetch('program').strip, grows['line'] || '', grows.fetch('from', ''),
      grows.fetch('to', ''), JSON.generate(scene['ink_mask']), pin
    ].join("\0"))
  end

  def self.validate!(source, data)
    manifest = data['helios_ink']
    fail_with = ->(why) { raise ArgumentError, "Compiled Helios ink #{why}. Run BASE=http://localhost:4001 node design/compile-ink.mjs (see design/scroll-rendering.md)." }
    fail_with.call('is missing') unless manifest && manifest['schema'] == 1
    pin = data.fetch('hatch').fetch('artifact_path')
    fail_with.call('uses a different host') unless manifest['artifact'] == pin
    { 'compiler' => 'design/compile-ink.mjs', 'model' => 'assets/js/home/ink-state.mjs' }.each do |key, path|
      fail_with.call("has a stale #{key}") unless manifest[key] == Digest::SHA256.file(File.join(source, path)).hexdigest
    end
    checked = {}
    data.fetch('helios_possibilities').each do |name, scene|
      next unless scene['program']
      ink = manifest.fetch('scenes', {})[name]
      fail_with.call("is stale for #{name}") unless ink && ink['signature'] == signature(scene, pin)
      %w[wide narrow].each do |layout|
        frames = ink.fetch('layouts', {})[layout]
        fail_with.call("has no #{name}/#{layout} still") unless frames && frames.fetch('frames', {})['settled']
        fail_with.call('exceeds the per-image pixel budget') unless frames['width'].positive? && frames['height'].positive? && frames['width'] * frames['height'] <= 1_100_000
        frames['frames'].each_value do |path|
          next if checked[path]
          fail_with.call('contains an unsafe asset path') unless path.match?(%r{\A/assets/lib/helios/ink/[a-z0-9_-]+-[a-f0-9]{16}\.webp\z})
          file = File.join(source, path.delete_prefix('/'))
          fail_with.call("is missing #{path}") unless File.file?(file)
          fail_with.call("has corrupt pixels at #{path}") unless path.end_with?("-#{Digest::SHA256.file(file).hexdigest[0, 16]}.webp")
          checked[path] = true
        end
      end
    end
    true
  end
end

if defined?(Jekyll)
  Jekyll::Hooks.register :site, :post_read do |site|
    # Bootstrap escape hatch only: author a new pin/programme on a local server,
    # compile it, then build normally. Never bypass freshness in production.
    next if ENV['PL_COMPILE_INK'] == '1' && Jekyll.env != 'production'
    CompiledInk.validate!(site.source, site.data)
  end
end
