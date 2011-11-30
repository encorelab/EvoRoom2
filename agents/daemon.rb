$: << "sail.rb/lib"
require 'sail/daemon'

require 'event_logger'

AGENT_PASSWORD = "3253212e47e29dc6447ea760357e7290979d43b8"

@daemon = Sail::Daemon.spawn(
  :name => "evoroom",
  :path => '.',
  :verbose => true
)

@daemon.load_config("../config.json")

# A run 1
@daemon << EventLogger.new(:room => "michelle-fall-2011", :password => AGENT_PASSWORD, :database => 'evoroom')

# A run 2
#@daemon << Archivist.new(:room => "evoroom-a2", :password => AGENT_PASSWORD, :database => 'evoroom')
#@daemon << Notetaker.new(:room => "evoroom-a2", :password => AGENT_PASSWORD, :database => 'evoboard')


@daemon.start
