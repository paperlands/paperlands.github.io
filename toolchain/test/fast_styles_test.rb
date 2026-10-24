# frozen_string_literal: true

# Black-box contract for the real pipeline, using a deterministic subprocess in
# place of Tailwind. No browser, timers as assertions, or source-tree outputs.
require 'jekyll'
require 'tmpdir'
require 'json'
require 'rbconfig'
require_relative '../../_plugins/fast_styles'

Site = Struct.new(:source, :dest, :config, :time)

def assert(condition, message)
  raise message unless condition
end

def rejects(message)
  yield
  raise "accepted #{message}"
rescue StandardError => error
  raise if error.message == "accepted #{message}"
  error
end

def fixture
  Dir.mktmpdir('style-contract-') do |root|
    FileUtils.mkdir_p(File.join(root, 'css'))
    File.write(File.join(root, 'css/app.css'), '@import "./tokens.css";')
    File.write(File.join(root, 'css/tokens.css'), ':root { --ink: black }')
    File.write(File.join(root, 'css/mode.css'), '.mode { color: black }')
    File.write(File.join(root, 'page.html'), '<main class="block">Hello</main>')
    cli = File.join(root, '.compiler')
    File.write(cli, <<~RUBY)
      #!#{RbConfig.ruby}
      require 'fileutils'
      require 'json'
      input = ARGV[ARGV.index('--input') + 1]
      output = ARGV[ARGV.index('--output') + 1]
      events = File.join(Dir.pwd, '.events')
      emit = ->(phase) {
        File.open(events, 'a') { |f| f.flock(File::LOCK_EX); f.puts(JSON.generate([phase, Process.pid, File.basename(input), ENV['TMPDIR']])) }
      }
      emit.call('start')
      # A barrier makes parallelism observable without asserting elapsed time.
      if File.file?('.barrier')
        wanted = Integer(File.read('.barrier'))
        deadline = Process.clock_gettime(Process::CLOCK_MONOTONIC) + 5
        until File.readlines(events).count { |line| JSON.parse(line).first == 'start' } >= wanted
          abort 'barrier timeout' if Process.clock_gettime(Process::CLOCK_MONOTONIC) > deadline
          sleep 0.005
        end
      end
      if File.file?('.pause')
        File.write('.started', '')
        sleep 0.005 until File.file?('.release')
      end
      source = File.read(input)
      sleep 0.05
      Process.kill('KILL', Process.pid) if source.include?('KILLED')
      abort 'intentional compiler failure' if source.include?('FAIL')
      unless source.include?('NO_WRITE')
        FileUtils.mkdir_p(File.dirname(output))
        File.write(output, source.include?('EMPTY') ? '' : 'compiled ' + source)
      end
      emit.call('end')
    RUBY
    File.chmod(0o755, cli)
    FastStyles.define_singleton_method(:tailwind_bin) { cli }
    site = Site.new(root, File.join(root, '_site'), {
      'destination' => '_site', 'cache_dir' => '.cache',
      'tailwind' => { 'input' => 'css/app.css', 'output' => '_site/assets/css/app.css' },
      'css_modes' => { 'mode' => { 'input' => 'css/mode.css', 'output' => 'assets/css/mode.css' } }
    }, Time.now)
    yield site
  end
end

def build(site)
  site.time = Time.utc(2000, 1, 1) # Build time must not bypass fingerprints.
  FastStyles.build(site)
end

def events(site)
  path = File.join(site.source, '.events')
  File.file?(path) ? File.readlines(path).map { |line| JSON.parse(line) } : []
end

def starts(site)
  events(site).count { |event| event.first == 'start' }
end

def output(site, name = 'app.css')
  File.join(site.dest, 'assets/css', name)
end

failures = []
check = lambda do |name, &block|
  block.call
  puts "ok: #{name}"
rescue StandardError => error
  failures << "#{name}: #{error.message}"
  warn "FAIL: #{failures.last}"
end

check.call('cold build, warm cache, scanned source and imported CSS invalidation') do
  fixture do |site|
    build(site)
    assert(starts(site) == 2 && File.size(output(site)).positive?, 'cold build missing sheets')
    assert((File.stat(output(site)).mode & 0o777) == 0o644, 'deployed stylesheet is not publicly readable')
    abandoned = File.join(File.dirname(output(site)), '.style-abandoned.tmp')
    File.write(abandoned, 'partial sheet from a killed publisher')
    build(site)
    assert(starts(site) == 2, 'warm build ran a compiler')
    assert(!File.exist?(abandoned), 'abandoned publish tempfile survived a warm build')
    File.write(File.join(site.source, 'page.html'), '<main class="flex">Changed</main>')
    build(site)
    assert(starts(site) == 3, 'page edit must rebuild only the scanning entry')
    File.write(File.join(site.source, 'css/tokens.css'), ':root { --ink: blue }')
    build(site)
    assert(starts(site) == 4, 'imported CSS did not invalidate entry')
    File.write(File.join(site.source, 'css/mode.css'), '.mode { color: blue }')
    build(site)
    assert(starts(site) == 5, 'mode edit must rebuild only that mode')
    File.write(output(site), 'x' * File.size(output(site)))
    build(site)
    assert(starts(site) == 6, 'same-size output corruption accepted')
  end
end

check.call('parallel batch and serial escape hatch own separate temporary directories') do
  fixture do |site|
    File.write(File.join(site.source, '.barrier'), '2')
    build(site)
    log = events(site)
    assert(log.first(2).all? { |event| event.first == 'start' }, 'parallel jobs did not overlap')
    assert(log.first(2).map(&:last).uniq.size == 2, 'parallel jobs shared TMPDIR')
    File.delete(File.join(site.source, '.barrier'))
    site.config['fast_styles'] = false
    build(site)
    assert(events(site).drop(4).map(&:first) == %w[start end start end], 'serial escape hatch still spawned concurrently')
    site.config['fast_styles'] = { 'parallel' => false, 'cache' => false }
    build(site)
    assert(events(site).drop(8).map(&:first) == %w[start end start end], 'parallel:false is not serial')
  end
end

check.call('removed modes prune even on a warm build; destinations cannot prune each other') do
  fixture do |site|
    build(site)
    other = Site.new(site.source, File.join(site.source, '_site.other'), Marshal.load(Marshal.dump(site.config)), Time.now)
    other.config['destination'] = other.dest
    other.config['css_modes'] = {}
    build(other)
    assert(File.file?(output(site, 'mode.css')), 'second destination deleted first destination mode')
    assert(File.file?(output(other)), 'destination override lost app.css')
    site.config['css_modes'] = {}
    build(site)
    assert(!File.exist?(output(site, 'mode.css')), 'removed mode survived a cache hit')
  end
end

check.call('failed, missing and empty compiler output never certify an older sheet') do
  %w[FAIL NO_WRITE EMPTY KILLED].each do |failure|
    fixture do |site|
      build(site)
      original = File.binread(output(site))
      File.write(File.join(site.source, 'css/app.css'), failure)
      error = rejects(failure) { build(site) }
      assert(error.message.include?('app.css'), 'failure does not identify the sheet')
      assert(File.binread(output(site)) == original, 'failed compilation damaged previous output')
      count = starts(site)
      rejects(failure) { build(site) }
      assert(starts(site) > count, 'failure cached as success')
    end
  end
end

check.call('concurrent builds cannot remove each other\'s temporary files') do
  fixture do |site|
    # Each child has its own in-memory state, exactly as two build commands do.
    pids = 2.times.map do
      fork do
        begin
          build(site)
          exit! 0
        rescue StandardError => error
          warn error.full_message
          exit! 1
        end
      end
    end
    assert(pids.map { |pid| Process.wait2(pid).last.success? }.all?, 'overlapping build failed')
    assert(File.size(output(site)).positive?, 'overlapping builds lost output')
    directories = events(site).select { |e| e.first == 'start' }.map(&:last)
    assert(directories.uniq.size == directories.size, 'build invocations reused mutable TMPDIR')
    count = starts(site)
    build(site)
    assert(starts(site) == count, 'concurrent output was not cached')
  end
end

check.call('sources changed during compilation are not certified as current') do
  fixture do |site|
    site.config['css_modes'] = {}
    File.write(File.join(site.source, '.pause'), '')
    editor = Thread.new do
      deadline = Process.clock_gettime(Process::CLOCK_MONOTONIC) + 5
      until File.exist?(File.join(site.source, '.started'))
        raise 'compiler never started' if Process.clock_gettime(Process::CLOCK_MONOTONIC) > deadline
        sleep 0.005
      end
      File.write(File.join(site.source, 'page.html'), 'changed during compile')
      File.write(File.join(site.source, '.release'), '')
    end
    build(site)
    editor.value
    File.delete(File.join(site.source, '.pause'))
    build(site)
    assert(starts(site) == 2, 'mixed-source output cached')
  end
end

check.call('a non-hidden cache directory never becomes its own scan input') do
  fixture do |site|
    site.config['cache_dir'] = 'build-cache'
    build(site)
    count = starts(site)
    build(site)
    assert(starts(site) == count, 'pipeline hashed its own generated cache files')
  end
end

check.call('invalid destination paths and duplicate output ownership fail before compiling') do
  fixture do |site|
    site.config['tailwind']['output'] = '../outside.css'
    rejects('output outside destination') { build(site) }
    assert(starts(site).zero?, 'unsafe output spawned a compiler')
    site.config['tailwind']['output'] = 'assets/css/mode.css'
    rejects('duplicate outputs') { build(site) }
    assert(starts(site).zero?, 'duplicate output spawned competing compilers')
  end
end

abort failures.join("\n") unless failures.empty?
puts 'PASS: stylesheet pipeline contracts'
