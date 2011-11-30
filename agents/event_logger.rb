require 'rubygems'
require 'blather/client/dsl'
require 'json'
require 'mongo'

require 'ruby-debug'

$: << 'sail.rb/lib'
require 'sail/agent'

class EventLogger < Sail::Agent
  def behaviour
    when_ready do
      @mongo = Mongo::Connection.new.db(config[:database])
      
      pres = Blather::Stanza::Presence::Status.new
      pres.to = agent_jid_in_room
      pres.state = :chat
      
      log "Joining #{agent_jid_in_room.inspect}..."
      
      client.write(pres)
    end
    
    # we don't specify an event type, so this will catch ALL events
    event do |stanza, data|
      log "Storing event: #{data.inspect}"
      @mongo.collection('events').save(data)
    end
  end
end
