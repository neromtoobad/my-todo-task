
import { Goal } from './types';

export const INITIAL_GOALS: Goal[] = [
  { id: 'wakeUp', label: 'Get Up Early', timeLabel: '6:00 AM - 6:30 AM', target: 'Wake & stretch', isMVD: true, startTime: '06:00', endTime: '06:30' },
  { id: 'jog', label: 'Morning Run', timeLabel: '6:30 AM - 7:15 AM', target: '45 min cardio', isMVD: false, startTime: '06:30', endTime: '07:15' },
  { id: 'breakfast', label: 'Big Breakfast', timeLabel: '7:15 AM - 8:00 AM', target: '800+ cal', isMVD: false, startTime: '07:15', endTime: '08:00' },
  { id: 'web3Work', label: 'Web3 Work', timeLabel: '8:00 AM - 12:00 PM', target: '4 hrs deep work', isMVD: true, startTime: '08:00', endTime: '12:00' },
  { id: 'lunch', label: 'Lunch', timeLabel: '12:00 PM - 1:00 PM', target: '900+ cal', isMVD: false, startTime: '12:00', endTime: '13:00' },
  { id: 'scholarships', label: 'Scholarships', timeLabel: '1:00 PM - 3:30 PM', target: '2.5 hrs focus', isMVD: true, startTime: '13:00', endTime: '15:30' },
  { id: 'break', label: 'Break & Walk', timeLabel: '3:30 PM - 4:00 PM', target: '30 min rest', isMVD: false, startTime: '15:30', endTime: '16:00' },
  { id: 'claudeCode', label: 'Claude Code', timeLabel: '4:00 PM - 6:00 PM', target: '2 hrs learning', isMVD: false, startTime: '16:00', endTime: '18:00' },
  { id: 'workout', label: 'Work Out', timeLabel: '6:00 PM - 6:30 PM', target: '30 min home', isMVD: false, startTime: '18:00', endTime: '18:30' },
  { id: 'dinner', label: 'Dinner', timeLabel: '6:30 PM - 7:30 PM', target: '1000+ cal', isMVD: false, startTime: '18:30', endTime: '19:30' },
  { id: 'admin', label: 'Admin & Planning', timeLabel: '7:30 PM - 8:00 PM', target: 'Plan tomorrow', isMVD: false, startTime: '19:30', endTime: '20:00' },
  { id: 'beats', label: 'Beat Making', timeLabel: '8:00 PM - 11:00 PM', target: '3 hrs session', isMVD: false, startTime: '20:00', endTime: '23:00' },
  { id: 'calories', label: 'Total Calories', timeLabel: 'Track all day', target: '3000+ total', isMVD: true, startTime: null, endTime: null },
  { id: 'sleep', label: 'Sleep On Time', timeLabel: '11:30 PM', target: 'In bed', isMVD: false, startTime: '23:30', endTime: null }
];
