require 'tempfile'

module Jekyll
  module Converters
    class Tailwind < Converter
      safe true
      priority :low
  
      def matches(ext)
        ext =~ /^\.tailwind$/i
      end
  
      def output_ext(_ext)
        ""
      end
  
      def convert(content)
        out = ""
        Tempfile.create do |file|
          file.write(content)
          spawn 'tailwindcss', *%W[-i assets/css/app.css -c tailwind.config.js -o #{out_path(file.path)}]
          Process.wait
          out = File.read(out_path(file.path))
        end
        out
      end

      def out_path(in_path)
        File.join(File.dirname(in_path), "out.css")
      end
    end
  end
end
