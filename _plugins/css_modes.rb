# frozen_string_literal: true

require "tailwindcss/ruby"

# css_modes — the per-surface stylesheets.
#
# `assets/css/app.css` is one entry for the whole site, and it is the right
# shape for what every surface has in common: tokens, lights, faces, the
# base document, the bar, the drawn mark, media. What it should not be is the
# place a surface's own composition lives, because then every page ships every
# surface's composition. Measured on a throttled phone, a note carrying the
# landing's 60KB of acts cost 690ms of first paint (design/probe/README.md,
# "the crossing"): `helios.css` (63KB), `evening.css` (56KB) and
# `twilight.css` (6KB) are three compositions, and no page wanted more than
# one of them.
#
# So each of those three builds to its own file, and `_includes/head.html`
# links the one the page is: `page.look` on a look page, the layout's
# `css_mode` where the surface is a layout (the note, Twilight).
#
# THE COMPILATION LIVES IN _plugins/fast_styles.rb. Four sheets are built every
# build — this file's three modes and the Tailwind entry — and each one is a CLI
# process. fast_styles.rb runs all four as one parallel, fingerprinted batch and
# retires the jekyll-tailwind gem's own hook; the hook at the bottom of this
# file calls into it, and the loop below is what runs when fast_styles is not
# loaded at all.
#
# TWO THINGS THIS DEPENDS ON.
#
#   1. app.css must be linked BEFORE any mode sheet. Layer order is settled by
#      first appearance, and app.css is where `@layer theme, base, components,
#      utilities` is declared by Tailwind. A mode sheet linked first would put
#      its own `@layer components` ahead of `base` and quietly out-rank it.
#   2. A mode sheet carries no utilities and no @tailwind directives; it is
#      hand-written component CSS reading roles. It is run through the same
#      CLI as app.css so that it is minified by the same minifier, and so that
#      a syntax error fails the build here rather than in a browser.
module CssModes
  # The modes, when fast_styles.rb is not loaded. The identical loop used to run
  # from the hook below, one CLI process per mode, every build.
  def self.build(site)
    site.config.fetch("css_modes", {}).each do |name, spec|
      input = File.join(site.source, spec.fetch("input"))
      output = File.join(site.dest, spec.fetch("output"))

      unless File.file?(input)
        raise "css mode #{name}: no such input #{input}"
      end

      command = [Tailwindcss::Ruby.executable, "--input", input, "--output", output]
      command << "--minify" if spec.fetch("minify", true)
      log = `#{command.join(' ')} 2>&1`

      # An unwritten or empty stylesheet is the failure this hook exists to
      # prevent: the page would link a 404 and render as raw HTML, and the
      # build would still have exited 0.
      unless File.file?(output) && File.size(output).positive?
        raise "css mode #{name}: the CLI produced nothing for #{spec['output']}\n#{log}"
      end

      Jekyll.logger.info "CSS mode:", "#{name} -> #{spec['output']} (#{File.size(output)} bytes)"
    end
  end
end

Jekyll::Hooks.register :site, :post_write do |site|
  # Not a second owner: when fast_styles.rb is loaded its hook has already built
  # these sheets (and app.css) as one batch, and this call finds each mode built
  # in this pass and does nothing. When it is not loaded, the loop above is the
  # whole of it.
  if defined?(FastStyles)
    FastStyles.build(site, :only => :modes) if FastStyles.enabled?(site)
    next
  end

  CssModes.build(site)
end
