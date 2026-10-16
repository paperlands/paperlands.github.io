# frozen_string_literal: true

# FastStatic — the static files, not copied when they cannot have changed.
#
# WHAT IT COSTS. `_site` is 146MB, and all but a few hundred KB of that is
# static: the media library under `assets/lib/`, the fonts, the favicons. Jekyll
# writes every one of them on every build, and `StaticFile#modified?` cannot
# save it, because the freshness it consults (`StaticFile.mtimes`) is a hash on
# the class — empty in every new process, so every `jekyll build` copies the
# lot, and every `jekyll clean` guarantees the next one does too. Here that was
# 0.4-1.4s of a build and 146MB of writes, for files that had not changed.
#
# WHAT IT DOES INSTEAD.
#
#   1. It asks the destination, not a process-local hash: a destination that is
#      the same file (a hard link we made earlier) or that has the source's size
#      and mtime is already what this write would produce, and is left alone.
#      This is the check that survives a new process.
#
#   2. In development it makes that destination a HARD LINK to the source rather
#      than a copy. `_site` and the source tree are on one filesystem, so a link
#      is one syscall where a copy is 146MB of read and write, and it is honest:
#      the two paths hold one file, so an asset edited in place is never served
#      stale. Production builds keep the copy — a deploy artifact should not
#      share inodes with the worktree — as does any destination where linking is
#      refused (a different device, an overlay, a mount that forbids it), which
#      is caught rather than assumed.
#
# Jekyll's own contract is kept: the write still returns false when it wrote
# nothing, still records its mtime, and still utimes a *copy* so that the next
# build's comparison holds. A link is not utimed — utime on a hard link is utime
# on the source file, which would edit the worktree to say a build happened.
module FastStatic
  class << self
    # `fast_static: false` is the off switch, and so is the `link` key.
    def config(site)
      value = site.config["fast_static"]
      value.is_a?(Hash) ? value : {}
    end

    def link?(site)
      return false if ENV["PL_FAST_STATIC_LINK"] == "0"
      return false if site.config["fast_static"] == false
      return false if Jekyll.env == "production" || site.safe

      config(site).fetch("link", true)
    end

    def link(src, dest)
      File.link(src, dest)
      true
    rescue SystemCallError => e
      # EXDEV (another filesystem), EPERM (a mount that refuses links), ENOSPC
      # (no entry to give): the copy below is always the answer, so this is a
      # debug line and not a failure.
      Jekyll.logger.debug "FastStatic:", "linking #{src} refused (#{e.class}); copying"
      false
    end
  end
end

module Jekyll
  class StaticFile
    def write(dest)
      dest_path = destination(dest)
      return false if written?(dest_path) && !relink?(dest_path)

      self.class.mtimes[path] = mtime

      FileUtils.mkdir_p(File.dirname(dest_path))
      FileUtils.rm(dest_path) if File.exist?(dest_path)
      return true if FastStatic.link?(@site) && FastStatic.link(path, dest_path)

      copy_file(dest_path)
      true
    end

    private

    # An up-to-date destination that is a copy is re-linked when linking is
    # possible: it already carries the source's size and mtime, so this swaps
    # bytes for an inode and changes nothing else. Without it, a destination
    # built before this plugin existed keeps 146MB of duplicated media until
    # somebody runs `jekyll clean`.
    def relink?(dest_path)
      FastStatic.link?(@site) && !File.identical?(path, dest_path)
    end

    # Is the destination already this file? Same inode is what a previous build
    # left when it linked; equal size and mtime is what it left when it copied,
    # because `copy_file` utimes the copy to the source's mtime.
    def written?(dest_path)
      return false unless File.exist?(dest_path)
      return true if File.identical?(path, dest_path)

      File.size(dest_path) == File.size(path) && File.mtime(dest_path).to_i == mtime
    end
  end
end
