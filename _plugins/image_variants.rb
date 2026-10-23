# frozen_string_literal: true

# Responsive stills. The recipe is _data/image_sources.yml; the bytes are not
# committed. Video stays minted by design/mint-media.mjs and is not touched here.
#
# Two hooks, because the two moments are different:
#
#   post_read   encode into .jekyll-cache (or reuse a rung whose inputs have not
#               changed) and fill site.data["image_variants"] before Liquid
#               renders. img.html and the wordmark lookup read that manifest.
#   post_write  copy the cache into the destination. Jekyll's cleaner deletes
#               every destination file it did not produce, and it runs before
#               write, so a file planted in the destination earlier would be
#               swept. The cache lives through that. Copying after write is
#               what the deploy artifact contains.
#
# Nothing is written into the source tree. A hardlink from assets/ back to a
# generated rung would dirty the worktree on every serve and fight FastStatic.
#
# The rung name hashes the source bytes, the width, and the pinned encoder
# version. It does not hash the output. Fail closed: a missing node, a missing
# sharp, a missing source, or an unsafe path stops the build. There is no mode
# that ships the full file instead.
require "fileutils"
require "json"
require "open3"

module ImageVariants
  class << self
    attr_accessor :pending

    def cache_dir(site)
      File.expand_path(File.join(site.source, ".jekyll-cache", "image-variants"))
    end

    def prepare(site)
      self.pending = nil
      root = File.expand_path(site.source)
      cache = cache_dir(site)
      script = File.join(root, "design", "image-variants.mjs")
      stdout, stderr, status = Open3.capture3(
        "node", script, "prepare", "--root", root, "--cache", cache,
        chdir: root,
      )
      unless status.success?
        detail = [stderr, stdout].map { |text| text.to_s.strip }.reject(&:empty?).join("\n")
        raise Jekyll::Errors::FatalException, "Image variants failed.\n#{detail}"
      end
      result = JSON.parse(stdout)
      publish = result.fetch("publish")
      publish.each { |item| accept!(item, cache) }
      site.data["image_variants"] = result.fetch("manifest")
      self.pending = publish
      line = "#{result["sources"]} sources, #{result["encoded"]} encoded, #{result["cached"]} cached"
      if result["encoded"].to_i.positive?
        Jekyll.logger.info "Images:", line
      else
        Jekyll.logger.debug "Images:", line
      end
      Jekyll.logger.debug "Images:", result["encoder"].to_s
    rescue JSON::ParserError
      raise Jekyll::Errors::FatalException, "Image variants: encoder did not return JSON.\n#{stdout}\n#{stderr}"
    rescue Errno::ENOENT
      raise Jekyll::Errors::FatalException,
        "Image variants: node is not on PATH. Stills are encoded by design/image-variants.mjs (npm ci, Node 20)."
    end

    def publish(site)
      list = pending
      self.pending = nil
      return if list.nil?

      dest_root = File.expand_path(site.dest)
      list.each do |item|
        from = item.fetch("from")
        rel = item.fetch("to")
        target = File.expand_path(rel, dest_root)
        unless target.start_with?(dest_root + File::SEPARATOR)
          raise Jekyll::Errors::FatalException, "Image variants: refusing to write outside the destination (#{rel})"
        end
        raise Jekyll::Errors::FatalException, "Image variants: missing cache file #{from}" unless File.file?(from)

        FileUtils.mkdir_p(File.dirname(target))
        tmp = "#{target}.#{Process.pid}"
        begin
          FileUtils.cp(from, tmp)
          File.rename(tmp, target)
        ensure
          FileUtils.rm_f(tmp) if File.exist?(tmp)
        end
      end
    end

    private

    def accept!(item, cache)
      rel = item["to"]
      from = item["from"]
      cache_root = File.expand_path(cache)
      unless rel.is_a?(String) && rel.end_with?(".webp") && !rel.start_with?("/") && !rel.include?("..") && !rel.include?("\\")
        raise Jekyll::Errors::FatalException, "Image variants: refusing publish path #{rel.inspect}"
      end
      from_abs = File.expand_path(from.to_s)
      unless from_abs.start_with?(cache_root + File::SEPARATOR) && File.file?(from_abs)
        raise Jekyll::Errors::FatalException, "Image variants: rung is not in the cache (#{from})"
      end
      item["from"] = from_abs
    end
  end
end

if defined?(Jekyll)
  Jekyll::Hooks.register :site, :post_read do |site|
    ImageVariants.prepare(site)
  end

  Jekyll::Hooks.register :site, :post_write do |site|
    ImageVariants.publish(site)
  end
end
