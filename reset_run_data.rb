require 'rubygems'
require 'mongo'
require 'json'

$: << "agents/sail.rb/lib"

DB = "evoroom"
RUN = "michelle-fall-2011"

require 'sail/rollcall/user'

json = File.read("config.json")
config = JSON.parse(json, :symbolize_names => true)

mongo = Mongo::Connection.new.db(DB)

puts "Wiping data in mongo..."
mongo.collection(:location_tracking).remove()
mongo.collection(:events).remove()
mongo.collection(:rainforest_guesses).remove()
mongo.collection(:organism_presence).remove()

keep_metadata_keys = ["assigned_organism_1", "assigned_organism_2", "key"]

Rollcall::User.site = config[:rollcall][:url]

Rollcall::User.find(:all, :from => "/runs/#{RUN}/users.xml").each do |u|
  puts "Wiping metadata for #{u.account.login.inspect}..."
  (u.metadata.attributes.keys).each do |key|
    unless keep_metadata_keys.include?(key)
      puts " - #{key}"
      u.metadata.send("#{key}=", nil)
    end
  end
  u.save
end