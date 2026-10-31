// Sample data. Replace with a real export later; app.js only needs these three lists.
// Due dates are stored as "days from today" so the sample always shows some overdue orders.

const BUILDINGS = [
  { id: "HT", name: "Harbour Tower", floors: 7 },
  { id: "GA", name: "Granary Annex", floors: 4 },
  { id: "NL", name: "North Lab", floors: 5 },
  { id: "RL", name: "Riverside Library", floors: 3 },
  { id: "DW", name: "Depot Workshop", floors: 2 },
  { id: "CH", name: "Civic Hall", floors: 6 },
];

// capacity = how many open orders this technician can reasonably carry at once
const TECHNICIANS = [
  { id: "t1", name: "Marta Kowalski", trade: "Electrical", capacity: 5 },
  { id: "t2", name: "Devon Achterberg", trade: "Electrical", capacity: 5 },
  { id: "t3", name: "Priya Raman", trade: "Plumbing", capacity: 4 },
  { id: "t4", name: "Tomas Lindqvist", trade: "Plumbing", capacity: 4 },
  { id: "t5", name: "Joon-ho Baek", trade: "Aircon", capacity: 5 },
  { id: "t6", name: "Amara Osei", trade: "Aircon", capacity: 4 },
  { id: "t7", name: "Felix Moreau", trade: "Lifts", capacity: 3 },
  { id: "t8", name: "Sofia Dragan", trade: "General", capacity: 5 },
];

const WORK_ORDERS = [
  { id: "WO-3101", title: "Flickering corridor lights, level 3", building: "HT", trade: "Electrical", priority: "Medium", status: "In progress", technicianId: "t1", dueInDays: -4 },
  { id: "WO-3102", title: "Replace failed emergency exit sign", building: "HT", trade: "Electrical", priority: "High", status: "Assigned", technicianId: "t1", dueInDays: -2 },
  { id: "WO-3103", title: "Distribution board trips under load", building: "GA", trade: "Electrical", priority: "Critical", status: "In progress", technicianId: "t1", dueInDays: -1 },
  { id: "WO-3104", title: "Install sockets in meeting room 2", building: "CH", trade: "Electrical", priority: "Low", status: "Assigned", technicianId: "t1", dueInDays: 6 },
  { id: "WO-3105", title: "Car park lighting timer fault", building: "DW", trade: "Electrical", priority: "Medium", status: "Assigned", technicianId: "t1", dueInDays: 2 },
  { id: "WO-3106", title: "Test and tag workshop tools", building: "DW", trade: "Electrical", priority: "Low", status: "New", technicianId: "t1", dueInDays: 9 },
  { id: "WO-3107", title: "Server room socket overheating", building: "NL", trade: "Electrical", priority: "Critical", status: "Assigned", technicianId: "t1", dueInDays: 0 },
  { id: "WO-3108", title: "Lab bench power strip replacement", building: "NL", trade: "Electrical", priority: "Medium", status: "Waiting on parts", technicianId: "t2", dueInDays: -3 },
  { id: "WO-3109", title: "Reading room lamp circuit", building: "RL", trade: "Electrical", priority: "Low", status: "Assigned", technicianId: "t2", dueInDays: 5 },
  { id: "WO-3110", title: "Stage lighting rig inspection", building: "CH", trade: "Electrical", priority: "Medium", status: "New", technicianId: "t2", dueInDays: 12 },
  { id: "WO-3111", title: "Burst pipe under level 2 kitchenette", building: "HT", trade: "Plumbing", priority: "Critical", status: "In progress", technicianId: "t3", dueInDays: -2 },
  { id: "WO-3112", title: "Blocked drain, ground floor toilets", building: "CH", trade: "Plumbing", priority: "High", status: "Assigned", technicianId: "t3", dueInDays: -1 },
  { id: "WO-3113", title: "Dripping tap in staff room", building: "RL", trade: "Plumbing", priority: "Low", status: "Assigned", technicianId: "t3", dueInDays: 7 },
  { id: "WO-3114", title: "Water heater thermostat replacement", building: "GA", trade: "Plumbing", priority: "Medium", status: "Waiting on parts", technicianId: "t3", dueInDays: 3 },
  { id: "WO-3115", title: "Low pressure on fourth floor", building: "HT", trade: "Plumbing", priority: "Medium", status: "New", technicianId: "t3", dueInDays: 4 },
  { id: "WO-3116", title: "Eye wash station flow test", building: "NL", trade: "Plumbing", priority: "High", status: "Assigned", technicianId: "t4", dueInDays: 1 },
  { id: "WO-3117", title: "Replace urinal flush valves", building: "CH", trade: "Plumbing", priority: "Low", status: "New", technicianId: "t4", dueInDays: 10 },
  { id: "WO-3118", title: "Leaking washdown tap in loading bay", building: "DW", trade: "Plumbing", priority: "Medium", status: "In progress", technicianId: "t4", dueInDays: 2 },
  { id: "WO-3119", title: "Chiller not reaching set point", building: "HT", trade: "Aircon", priority: "Critical", status: "In progress", technicianId: "t5", dueInDays: -3 },
  { id: "WO-3120", title: "Noisy fan coil unit, level 5", building: "HT", trade: "Aircon", priority: "Low", status: "Assigned", technicianId: "t5", dueInDays: 5 },
  { id: "WO-3121", title: "Lab fume cupboard airflow check", building: "NL", trade: "Aircon", priority: "High", status: "Assigned", technicianId: "t5", dueInDays: 1 },
  { id: "WO-3122", title: "Archive humidity control drifting", building: "RL", trade: "Aircon", priority: "High", status: "Waiting on parts", technicianId: "t5", dueInDays: -1 },
  { id: "WO-3123", title: "Replace filters, main hall AHU", building: "CH", trade: "Aircon", priority: "Medium", status: "New", technicianId: "t6", dueInDays: 8 },
  { id: "WO-3124", title: "Split unit leaking, office 1.04", building: "GA", trade: "Aircon", priority: "Medium", status: "Assigned", technicianId: "t6", dueInDays: 3 },
  { id: "WO-3125", title: "Passenger lift stops between floors", building: "HT", trade: "Lifts", priority: "Critical", status: "In progress", technicianId: "t7", dueInDays: 0 },
  { id: "WO-3126", title: "Goods lift door sensor fault", building: "GA", trade: "Lifts", priority: "High", status: "Waiting on parts", technicianId: "t7", dueInDays: -5 },
  { id: "WO-3127", title: "Repair broken window latch, reading room", building: "RL", trade: "General", priority: "Low", status: "Assigned", technicianId: "t8", dueInDays: 11 },
  { id: "WO-3128", title: "Roller door will not close", building: "DW", trade: "General", priority: "High", status: "In progress", technicianId: "t8", dueInDays: -2 },
  { id: "WO-3129", title: "Repaint stairwell after leak", building: "CH", trade: "General", priority: "Low", status: "New", technicianId: "t8", dueInDays: 14 },
  { id: "WO-3130", title: "Replace cracked ceiling tiles, level 4", building: "NL", trade: "General", priority: "Medium", status: "Assigned", technicianId: "t8", dueInDays: 4 },
];
