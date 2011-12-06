require 'golem'

require 'sail/rollcall/user'
require 'sail/rollcall/group'

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
  
  def group_code
    groups.first.name
  end
  
  delegate :mongo, :to => :agent
  delegate :log,   :to => :agent
  
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
    mongo.collection(:rainforest_guesses).save(guess)
  end
  
  def guess_received_for_all_locations?(guess)
    store_rainforest_guess(guess)
    received = mongo.collection(:rainforest_guesses).find({'group_code' => guess['group_code']}).to_a
    agent.log "Group #{guess['group_code'].inspect} has so far submitted #{received.count} guesses..."
    RAINFORESTS.all?{|loc| received.any?{|r| r['location'] == loc}}
  end
  
  def interview_submitted_for_all_interviewees?
    raise "IMPLEMENT ME"
  end
  
  # def store_assigned_organisms(organisms)
  #   (1..organisms.length).each do |i|
  #     metadata.send("assigned_organism_#{i}=", organisms[i-1])
  #   end
  # end
  
  def store_organism_presence(presence)
    #metadata.send("#{presence['location']_checked_for_presence}=", true)
    agent.log "Storing presence: #{presence.inspect}"
    mongo.collection(:organism_presence).save(presence)
  end
  
  def organism_presence_received_for_all_locations?(presence)
    store_organism_presence(presence)
    received = mongo.collection(:organism_presence).find({'username' => username}).to_a
    RAINFORESTS.all?{|loc| received.any?{|r| r['location'] == loc}}
  end
  
  def determine_next_location_for_guess
    Rollcall::Group.site = Student.site if Rollcall::Group.site.blank?
    
    group = Rollcall::Group.find(group_code)
    
    group_location = nil
    begin
      group_location = group.metadata.assigned_location_for_guess
    rescue NoMethodError # FIXME: shouldn't throw this if metadata is missing
      group_location = nil
    end
    
    if group_location
      location = group_location
      
      log "Student #{username.inspect}'s group (#{group_code.inspect}) already assigned to #{location.inspect}; sending student there..."
    else
      completed_rainforests = mongo.collection(:rainforest_guesses).find('group_code' => group_code).
        to_a.collect{|p| p['location']}.uniq
      
      remaining = Student::RAINFORESTS - completed_rainforests
      location = remaining[rand(remaining.length-1)]
    
      log "Assigning #{location.inspect} to #{username.inspect} (#{group_code.inspect}); remaining locations: #{remaining.inspect}"
      
      group.metadata.assigned_location_for_guess = location
      group.save
    end
    
    return location
  end
  
  def announce_completed_rainforests
    completed_rainforests = mongo.collection(:organism_presence).find('username' => username).
      to_a.collect{|p| p['location']}.uniq
      
    agent.event!(:rainforests_completed_announcement, {
      :username => username,
      :completed_rainforests => completed_rainforests
    })
  end
  
  def clear_group_location_assignment
    group = Rollcall::Group.find(group_code)
    group.metadata.assigned_location_for_guess = nil
    group.save
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
      on :check_in do
        transition :to => :IN_ROOM do
          guard(:failure_message => "the student must check in at the room entrance first") {|student, loc| loc == "room"}
          action :start_step_1
        end
      end
    end
    
    state :IN_ROOM do
      on :check_in, :to => :AT_PRESENCE_LOCATION
    end
    
    state :AT_PRESENCE_LOCATION do
      enter :announce_completed_rainforests
      on :organism_present do
        transition :to => :WAITING_FOR_LOCATION_FOR_GUESS, :if => :organism_presence_received_for_all_locations?, 
          :action => :start_step_2
        transition :to => :IN_ROOM
      end
      on :check_in, :to => :AT_PRESENCE_LOCATION
    end
    
    state :WAITING_FOR_LOCATION_FOR_GUESS do
      enter {|student| Student.agent.assign_location_for_guess(student) }
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
      enter {|student| Student.agent.assign_tasks_to_students_in_group(student.group) if student.all_group_members_at_assigned_location? }
      on :task_assignment, :to => :GUESS_TASK_ASSIGNED do
        action {|student, task| student.metadata.currently_assigned_task = task }
      end
    end
    
    state :GUESS_TASK_ASSIGNED do
      on :rainforest_guess_submitted do
        transition :to => :WAITING_FOR_INTERVIEWEES_ASSIGNMENT, :if => :guess_received_for_all_locations?,
          :action => :start_step_3
        transition :to => :WAITING_FOR_LOCATION_FOR_GUESS,
          :action => :clear_group_location_assignment
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