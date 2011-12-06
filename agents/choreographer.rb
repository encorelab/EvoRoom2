require 'rubygems'
require 'blather/client/dsl'
require 'json'
require 'mongo'

$: << 'sail.rb/lib'
require 'sail/agent'

require 'model/student'

class Choreographer < Sail::Agent
  
  attr_accessor :mongo
  
  def initialize(*args)
    super(*args)
    @students = {} # cache of Choreographer::Student objects
  end
  
  def behaviour
    when_ready do
      @mongo = Mongo::Connection.new.db(config[:database])
      Student.site = config[:sail][:rollcall][:url]
      Student.agent = self # give all Students managed by this Choreographer a reference to self
      
      join_room
      join_log_room
    end
    
    self_joined_log_room do |stanza|
      groupchat_logger_ready!
    end
    
    someone_joined_room do |stanza|
      stu = lookup_student(Util.extract_login(stanza.from), true)
      
      if stu
        stu.save if stu.dirty?
        log "#{stu} joined #{config[:room]}"
      end
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
    
    # event :organisms_assignment? do |stanza, data|
    #   username = data['payload']['username']
    #   organisms = [ data['payload']['first_organism'], data['payload']['second_organism'] ]
    #   stu = lookup_student(username)
    #   stu.organisms_assignment!(organisms)
    # end
    
    event :organism_present? do |stanza, data|
      username = data['origin']
      
      first  = data['payload']['first_organism']
      second = data['payload']['second_organism']
      
      presence = {
        'organisms' => [
          {first['organism'] => first['present']},
          {second['organism'] => second['present']}
        ],
        'location' => data['payload']['location'],
        'timestamp' => data['timestamp'],
        'username' => username
      }
      
      lookup_student(username).organism_present!(presence)
    end
    
    event :location_assignment? do |stanza, data|
      username = data['payload']['username']
      location = data['payload']['go_to_location']
      
      lookup_student(username).location_assignment!(location)
    end
    
    event :task_assignment? do |stanza, data|
      username = data['payload']['username']
      task = data['payload']['task']
      
      lookup_student(username).task_assignment!(task)
    end
    
    event :rainforest_guess_submitted? do |stanza, data|
      username = data['origin']
      
      guess = data['payload']
      guess['timestamp'] = data['timestamp']
      guess['username'] = username
      
      lookup_student(username).rainforest_guess_submitted!(guess)
    end
  end
  
  def start_step(step_id)
    event!(:start_step, {:step_id => step_id})
  end
  
  # def assign_organisms_to_student(stu)
  #   event!(:organisms_assignment, {
  #     :username => stu.username, 
  #     :first_organism => "foo", 
  #     :second_organism => "faa"
  #   })
  # end
  
  def assign_location_for_guess(stu)
    # TODO: crowd management
    
    location = stu.determine_next_location_for_guess
    
    event!(:location_assignment, {
      :go_to_location => location,
      :username => stu.username
    })
  end
  
  def assign_tasks_to_students_in_group(stu)
    if stu.has_been_a_scribe?
      task = ""
    end
      
    task = "scribe"
    
    log "Assigning task '#{task.inspect}' to #{stu.username.inspect}"
    
    stu.metadata.has_been_a_scribe = true
    
    event!(:task_assignment, {
      :task => task,
      :username => stu.username
    })
  end
  
  def assign_interviewees_to_student(stu)
    raise "assign_interviewees_to_student: IMPLEMENT ME"
  end
  
  def assign_rationale_to_student(stu)
    raise "assign_rationale_to_student: IMPLEMENT ME"
  end
  
  def lookup_student(username, restoring = false)
    stu = @students[username]
      
    if stu.nil?
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
    elsif restoring # make sure the entry event gets triggered when we are restoring but not reloading
      stu.state = stu.state
    end
    
    stu.agent = self
    return stu
  end
end
