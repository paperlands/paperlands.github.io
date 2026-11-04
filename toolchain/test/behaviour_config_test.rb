# frozen_string_literal: true

# Render actual production/development wiring without a browser or network.
require 'json'
require_relative 'contract_site'

root = File.expand_path('../..', __dir__)
site = ContractSite::Site.load(source: root)
check = ->(condition, message) { raise message unless condition }
previous_env = ENV['JEKYLL_ENV']
original = Marshal.load(Marshal.dump(site.data.fetch('behaviour')))

begin
  config = site.data.fetch('behaviour')
  check.call(config['schema'] == 1, 'Behaviour configuration must declare schema 1')
  %w[source medium campaign content].each do |key|
    values = config.fetch('campaign').fetch(key)
    check.call(values.is_a?(Array) && values.uniq == values, "#{key}: exact allowlist must be a unique array")
    check.call(values.all? { |value| value.is_a?(String) && !value.empty? && value.length <= 40 && !value.match?(/[@\s\/?#&%]/) }, "#{key}: unsafe campaign values")
  end

  ENV['JEKYLL_ENV'] = 'production'
  render = -> { site.render(data: { 'layout' => nil, 'title' => 'Measurement contract' }, content: '{% include head.html %}') }
  production = render.call
  scripts = production.css('script[src]').map { |script| script['src'] }
  check.call(scripts.count { |src| src.include?('odin.paperland.sg/js/') } == 1, 'Production must load native analytics exactly once')
  check.call(scripts.count('/preview/assets/js/behaviour.js') == 1, 'Production must load one baseurl-correct kernel')
  check.call(production.at_css('script[src="/preview/assets/js/behaviour.js"]').key?('defer'), 'The kernel must remain deferred')
  payloads = production.css('script#behaviour-config')
  check.call(payloads.size == 1 && JSON.parse(payloads.first.text) == config, 'Emitted JSON must preserve the complete configuration')
  check.call(production.at_css('meta[name="paperland-release"]')['content'] == config['release'], 'Release metadata must match config')

  # A closing tag in data must not terminate JSON or inject another element.
  config['release'] = 'test" </script><script id="injected">not executable</script>'
  config['acts'] = [{ 'name' => 'example', 'selector' => '[data-value="</script>"]' }]
  escaped = render.call
  check.call(escaped.css('script#behaviour-config').size == 1 && escaped.css('#injected').empty?, 'Data must not escape its JSON script element')
  check.call(JSON.parse(escaped.at_css('#behaviour-config').text) == config, 'Escaping must retain parsed values')
  check.call(escaped.at_css('meta[name="paperland-release"]')['content'] == config['release'], 'Release metadata must escape attribute delimiters')

  ENV['JEKYLL_ENV'] = 'development'
  development = render.call
  check.call(development.css('#behaviour-config, meta[name="paperland-release"]').empty?, 'Development must not emit behaviour configuration')
  check.call(development.css('script[src]').none? { |script| script['src'].include?('odin.paperland.sg') || script['src'].end_with?('/behaviour.js') }, 'Development must omit both analytics transports')
ensure
  site.data['behaviour'] = original
  ENV['JEKYLL_ENV'] = previous_env
end

puts 'PASS: schema/campaign data, production and development isolation, baseurl, JSON/attribute escaping'
