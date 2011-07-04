require "rubygems"
require "sprockets"
require "rack"

app = Rack::Builder.app do

    map '/assets' do        
        run Sprockets::Environment.new.tap { |e| e.append_path "." }
    end
    
end

Rack::Handler::WEBrick.run app, :Port => 9494