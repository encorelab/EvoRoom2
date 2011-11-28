$: << "sail.rb/lib"
require 'sail/daemon'

require 'archivist'
require 'notetaker'

AGENT_PASSWORD = "1d6f760bc95729166e551d7bee1d75c69b133015"

@daemon = Sail::Daemon.spawn(
  :name => "evoroom",
  :path => '.',
  :verbose => true
)

@daemon.load_config("../config.json")

# A run 1
@daemon << Archivist.new(:room => "evoroom-a1", :password => AGENT_PASSWORD, :database => 'evoroom')
@daemon << Notetaker.new(:room => "evoroom-a1", :password => AGENT_PASSWORD, :database => 'evoboard')

# A run 2
#@daemon << Archivist.new(:room => "evoroom-a2", :password => AGENT_PASSWORD, :database => 'evoroom')
#@daemon << Notetaker.new(:room => "evoroom-a2", :password => AGENT_PASSWORD, :database => 'evoboard')


@daemon.start
