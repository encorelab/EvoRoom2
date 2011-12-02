$: << "sail.rb/lib"
require 'sail/daemon'

require 'event_logger'
require 'location_tracker'

AGENT_PASSWORD = "3253212e47e29dc6447ea760357e7290979d43b8"
RUN = "michelle-fall-2011-matt"
DB = "evoroom"

@daemon = Sail::Daemon.spawn(
  :name => "evoroom",
  :path => '.',
  :verbose => true
)

@daemon.load_config("../config.json")

# A run 1
@daemon << EventLogger.new(:room => RUN, :password => AGENT_PASSWORD, :database => DB)
@daemon << LocationTracker.new(:room => RUN, :password => AGENT_PASSWORD, :database => DB)

# A run 2
#@daemon << Archivist.new(:room => "evoroom-a2", :password => AGENT_PASSWORD, :database => 'evoroom')
#@daemon << Notetaker.new(:room => "evoroom-a2", :password => AGENT_PASSWORD, :database => 'evoboard')


@daemon.start
