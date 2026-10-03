# frozen_string_literal: true

# NoteFrontMatter — a note carries front matter, and the BUILD does not add it.
#
# A note without front matter is not a document. Jekyll does not collect it: it
# becomes a static file, never reaches the collection, and is simply absent from
# the site — a failure that reports nothing. Stopping the build and naming the
# file is the only version of this that an author can act on.
#
# WHAT THIS USED TO DO. It prepended `---\n---\n` and WROTE THE NOTE FILE, from
# an `after_init` hook, on every build. That made a build a writer of source, and
# several agents edit this tree at once: a build could rewrite a note in the
# middle of another agent's edit. The convenience is still here, one environment
# variable away, but it is asked for rather than assumed.
#
# THE INVARIANT: a build may write its destination and its cache, never source.
module NoteFrontMatter
  EMPTY = "---\n---\n\n"

  # The notes directory, whether or not the collection has been set up yet (this
  # hook runs at `after_init`; `_notes` is the collection's default directory).
  def self.directory(site)
    collection = site.collections["notes"]
    File.join(site.source, collection ? collection.relative_directory : "_notes")
  end

  # Notes whose first bytes are not front matter.
  def self.missing(site)
    Dir.glob(File.join(directory(site), "**", "*.md")).sort.reject { |path| File.read(path).start_with?("---") }
  end

  # The fixer, run only when it is asked for (NOTE_FRONT_MATTER_AUTOFIX=1).
  def self.inject(paths)
    paths.each do |path|
      raw = File.read(path)
      File.write(path, EMPTY + raw) unless raw.start_with?("---")
    end
  end

  def self.check!(site)
    paths = missing(site)
    return if paths.empty?

    if ENV["NOTE_FRONT_MATTER_AUTOFIX"] == "1"
      inject(paths)
      Jekyll.logger.info "Note front matter:", "prepended --- to #{paths.size} note(s), as asked"
      return
    end

    listed = paths.map { |path| path.sub("#{site.source}/", "") }
    raise Jekyll::Errors::FatalException, <<~MSG
      Note front matter: these notes have none, so Jekyll will not collect them
      and they will be missing from the site:

        #{listed.join("\n  ")}

      Put `---` on the first line of each, or ask for the fixer to do it:

        NOTE_FRONT_MATTER_AUTOFIX=1 bundle exec jekyll build
    MSG
  end
end

Jekyll::Hooks.register :site, :after_init do |site|
  NoteFrontMatter.check!(site)
end
