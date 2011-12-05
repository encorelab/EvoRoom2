require 'sail/rollcall/user'

class Student < Rollcall::User
  self.element_name = "user"
  
  RAINFORESTS = [
      'rainforest_a',
      'rainforest_b',
      'rainforest_c',
      'rainforest_d'
    ]
  
  include Golem
  
  cattr_accessor :agent
  
  def to_s
    "Student:#{username.inspect}[#{state}]"
  end
  
  def username
    account.login
  end
  
  def start_step_1
    agent.start_step(:STEP_1)
  end
  
  def start_step_2
    agent.start_step(:STEP_2)
  end
  
  def start_step_3
    agent.start_step(:STEP_3)
  end
  
  def start_step_4
    agent.start_step(:STEP_4)
  end
  
  def store_rainforest_guess(guess)
    agent.log "Storing rainforest guess: #{guess.inspect}"
    agent.mongo.collection('rainforest_guesses').save(guess)
  end
  
  def guess_received_for_all_locations?(guess)
    store_rainforest_guess(guess)
    received = agent.mongo.collection('rainforest_guesses').find({'group_code' => guess['group_code']}).to_a
    agent.log "Group #{guess['group_code'].inspect} has so far submitted #{received.count} guesses..."
    RAINFORESTS.all?{|loc| received.any?{|r| r['location'] == loc}}
  end
  
  def interview_submitted_for_all_interviewees?
    raise "IMPLEMENT ME"
  end
  
  def store_assigned_organisms(organisms)
    (1..organisms.length).each do |i|
      metadata.send("assigned_organism_#{i}=", organisms[i-1])
    end
  end
  
  def store_organism_presence(presence)
    #metadata.send("#{presence['location']_checked_for_presence}=", true)
    agent.log "Storing presence: #{presence.inspect}"
    agent.mongo.collection('organism_presence').save(presence)
  end
  
  def organism_presence_received_for_all_locations?(presence)
    store_organism_presence(presence)
    received = agent.mongo.collection('organism_presence').find({'username' => username}).to_a
    RAINFORESTS.all?{|loc| received.any?{|r| r['location'] == loc}}
  end
  
  def announce_completed_rainforests
    completed_rainforests = agent.mongo.collection('organism_presence').find('username' => username).
      to_a.collect{|p| p['location']}.uniq
      
    agent.event!(:rainforests_complete_announcement, {
      :user_name => username,
      :completed_rainforests => completed_rainforests
    })
  end
  
  define_statemachine do
    initial_state :LOGGED_IN
    
    state_attribute_writer (proc do |student, new_state|
      student.metadata.state = new_state
    end)
    
    state_attribute_reader (proc do |student|
      student.metadata.state? && student.metadata.state
    end)
    
    on_all_transitions do |student, event, transition, *args|
      student.agent.log "#{student.username.inspect} transitioning from #{transition.from.name} to #{transition.to.name}..."
    end
  
    state :LOGGED_IN do
      # we're assuming that they're checking in for the "room"
      on :check_in, :to => :WAITING_FOR_ORGANISMS_ASSIGNMENT, :if => proc {|student, loc| loc == "room"},
        :action => :start_step_1
    end
    
    state :WAITING_FOR_ORGANISMS_ASSIGNMENT do
      enter {|student| Student.agent.assign_organisms_to_student(student)}
      on :organisms_assignment, :to => :ORGANISMS_ASSIGNED, :action => :store_assigned_organisms
    end
    
    state :ORGANISMS_ASSIGNED do
      on :check_in, :to => :AT_PRESENCE_LOCATION
    end
    
    state :AT_PRESENCE_LOCATION do
      on :organism_present do
        transition :to => :WAITING_FOR_LOCATION_FOR_GUESS, :if => :organism_presence_received_for_all_locations?, 
          :action => :start_step_2
        transition :to => :ORGANISMS_ASSIGNED, 
          :action => :announce_completed_rainforests # else
      end
    end
    
    state :WAITING_FOR_LOCATION_FOR_GUESS do
      enter {|student| Student.agent.assign_location_to_student(student) }
      on :location_assignment, :to => :GUESS_LOCATION_ASSIGNED do
        action {|student, loc| student.metadata.currently_assigned_location = loc }
      end
    end
    
    state :GUESS_LOCATION_ASSIGNED do
      on :check_in, :to => :AT_ASSIGNED_GUESS_LOCATION do
        guard(:failure_message => "the student is at the wrong location") do |student, loc| 
          student.metadata.currently_assigned_location == loc
        end
      end
    end
    
    state :AT_ASSIGNED_GUESS_LOCATION do
      enter {|student| Student.agent.assign_task_to_student(student) }
      on :task_assignment, :to => :GUESS_TASK_ASSIGNED do
        action {|student, task| student.metadata.currently_assigned_task = task }
      end
    end
    
    state :GUESS_TASK_ASSIGNED do
      on :rainforest_guess_submitted do
        transition :to => :WAITING_FOR_INTERVIEWEES_ASSIGNMENT, :if => :guess_received_for_all_locations?,
          :action => :start_step_3
        transition :to => :WAITING_FOR_LOCATION_FOR_GUESS
      end
    end
    
    state :WAITING_FOR_INTERVIEWEES_ASSIGNMENT do
      enter {|student| Student.agent.assign_interviewees_to_student(student) }
      on :interviewees_assigned, :to => :INTERVIEWEES_ASSIGNED
    end
    
    state :INTERVIEWEES_ASSIGNED do
      on :interview_started, :to => :INTERVIEWING
    end
    
    state :INTERVIEWING do
      on :interview_submitted, :to => :WAITING_FOR_RANKINGS, :if => :interview_submitted_for_all_interviewees?
      on :interview_submitted, :to => :INTERVIEWEES_ASSIGNED # else
    end
    
    state :WAITING_FOR_RANKINGS do
      on :rankings_submitted, :to => :WAITING_FOR_RATIONALE_ASSIGNMENT
    end
    
    state :WAITING_FOR_RATIONALE_ASSIGNMENT do
      enter {|student| Student.agent.assign_rationale_to_student(student) }
      on :rationale_assigned, :to => :WAITING_FOR_RATIONALE_SUBMISSION
    end
    
    state :WAITING_FOR_RATIONALE_SUBMISSION do
      on :rationale_submitted, :to => :WAITING_FOR_FINAL_GUESS
    end
    
    state :WAITING_FOR_FINAL_GUESS do
      on :final_guess_submitted, :to => :DONE
    end
  end
end