require 'rubygems'
require 'blather/client/dsl'
require 'json'
require 'mongo'
require 'golem'

$: << 'sail.rb/lib'
require 'sail/agent'

require 'model/student'

class Choreographer < Sail::Agent
  def initialize(*args)
    super(*args)
    @students = {} # cache of Choreographer::Student objects
    Student.agent = self # give all Students managed by this Choreographer a reference to self
  end
  
  def behaviour
    when_ready do
      @mongo = Mongo::Connection.new.db(config[:database])
      Rollcall::User.site = config[:sail][:rollcall][:url]
      
      join_room
      join_log_room
    end
    
    self_joined_log_room do |stanza|
      groupchat_logger_ready!
    end
    
    someone_joined_room do |stanza|
      stu = lookup_student(Util.extract_login(stanza.from))
      
      log "#{stu} joined #{config[:room]}" if stu
    end
    
    # presence(:from => Regexp.new("^"+Blather::JID.new(room_jid).to_s+".*"), :type => nil) do |stanza|
    #   rx = Regexp.new("^"+Blather::JID.new(room_jid).to_s+".*")
    #   from = stanza.from
    #   log "#{rx} =~ #{from} --> #{from =~ rx}"
    # end
    
    event :check_in? do |stanza, data|
      username = data['origin']
      location = data['payload']['location']
      
      stu = lookup_student(username)
      stu.check_in!(location)
    end
    
    event :organisms_assignment? do |stanza, data|
      username = data['payload']['user_name']
      organisms = [ data['payload']['first_organism'], data['payload']['second_organism'] ]
      stu = lookup_student(username)
      stu.organisms_assignment!(organisms)
    end
  end
  
  def start_step(step_id)
    #event!(:start_step, {:step_id => step_id})
  end
  
  def assign_organisms_to_student(stu)
    event!(:organisms_assignment, {:user_name => stu.username, :first_organism => "foo", :second_organism => "faa"})
  end
  
  def assign_location_to_student(stu)
    
  end
  
  def assign_task_to_student(stu)
    
  end
  
  def assign_interviewees_to_student(stu)
    
  end
  
  def assign_rationale_to_student(stu)
    
  end
  
  def lookup_student(username)
    stu = @students[username]
      
    unless stu
      log "Looking up user #{username.inspect} in Rollcall..."

      begin
        stu = Student.find(username)
      rescue ActiveResource::ResourceNotFound
        log "#{username.inspect} not found in Rollcall..."
        return nil
      end

      unless stu.kind == "Student"
        log "#{username.inspect} is not a student; will be ignored."
        return nil
      end
      
      log "#{username.inspect} loaded in state #{stu.state}"
      
      @students[username] = stu
    end
    
    stu.agent = self
    return stu
  end
end
