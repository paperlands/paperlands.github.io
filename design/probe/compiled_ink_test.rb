# ruby design/probe/compiled_ink_test.rb — no browser, gems or generated mutations.
require 'yaml'
require 'json'
require 'date'
require_relative '../../_plugins/compiled_ink'

ROOT = File.expand_path('../..', __dir__)
DATA = {
  'hatch' => YAML.safe_load_file(File.join(ROOT, '_data/hatch.yml'), permitted_classes: [Date]),
  'helios_possibilities' => YAML.safe_load_file(File.join(ROOT, '_data/helios_possibilities.yml')),
  'helios_ink' => JSON.parse(File.read(File.join(ROOT, '_data/helios_ink.json')))
}
def rejects(label)
  data = Marshal.load(Marshal.dump(DATA))
  yield data
  begin
    CompiledInk.validate!(ROOT, data)
  rescue ArgumentError => error
    raise 'Missing actionable regeneration instruction' unless error.message.include?('compile-ink.mjs')
    puts "ok: #{label}"
    return
  end
  raise "accepted stale/corrupt ink: #{label}"
end
raise 'Current output is invalid' unless CompiledInk.validate!(ROOT, DATA)
puts 'ok: current compiled programme, range, mask, pin and pixel digests'
rejects('changed programme') { |d| d['helios_possibilities']['creators']['program'] += "\nfw 1" }
rejects('changed range') { |d| d['helios_possibilities']['creators']['grows']['to'] = 50 }
rejects('changed vignette') { |d| d['helios_possibilities']['inquiry']['ink_mask'][0] = 0.6 }
rejects('changed host') { |d| d['hatch']['artifact_path'] = '/another-host.mjs' }
rejects('changed compiler') { |d| d['helios_ink']['compiler'] = 'outdated' }
rejects('changed scroll arithmetic') { |d| d['helios_ink']['model'] = 'outdated' }
rejects('missing settled figure') { |d| d['helios_ink']['scenes']['inquiry']['layouts']['wide']['frames'].delete('settled') }
rejects('unsafe asset path') { |d| d['helios_ink']['scenes']['inquiry']['layouts']['wide']['frames']['2'] = '/../private.webp' }
rejects('unbounded raster dimensions') { |d| d['helios_ink']['scenes']['inquiry']['layouts']['wide']['width'] = 100_000 }
