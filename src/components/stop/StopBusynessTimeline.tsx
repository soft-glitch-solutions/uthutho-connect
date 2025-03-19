
import { useState, useEffect } from "react";
import { 
  Card, 
  CardContent
} from "@/components/ui/card";
import { 
  Select, 
  SelectTrigger, 
  SelectValue, 
  SelectContent, 
  SelectItem 
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Users, Shield } from "lucide-react";
import { ChartContainer } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

// Define the type for the busy times data
interface StopBusyTime {
  id: string;
  stop_id: string;
  day_of_week: number;
  hour_of_day: number;
  busyness_level: number;
  safety_level: number;
  created_at?: string;
  updated_at?: string;
}

interface StopBusynessTimelineProps {
  busyTimes: StopBusyTime[];
}

// Day of week names
const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
];

// Format hour for display
const formatHour = (hour: number) => {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
};

// Get level color based on value (1-5)
const getBusynessColor = (level: number) => {
  switch (level) {
    case 1: return "bg-green-500";
    case 2: return "bg-green-300";
    case 3: return "bg-yellow-400";
    case 4: return "bg-orange-500";
    case 5: return "bg-red-500";
    default: return "bg-gray-300";
  }
};

// Get safety color based on value (1-5, where 5 is safest)
const getSafetyColor = (level: number) => {
  switch (level) {
    case 5: return "bg-green-500";
    case 4: return "bg-green-300";
    case 3: return "bg-yellow-400";
    case 2: return "bg-orange-500";
    case 1: return "bg-red-500";
    default: return "bg-gray-300";
  }
};

// Get text description for busyness level
const getBusynessLabel = (level: number) => {
  switch (level) {
    case 1: return "Very Low";
    case 2: return "Low";
    case 3: return "Moderate";
    case 4: return "High";
    case 5: return "Very High";
    default: return "Unknown";
  }
};

// Get text description for safety level
const getSafetyLabel = (level: number) => {
  switch (level) {
    case 5: return "Very Safe";
    case 4: return "Safe";
    case 3: return "Moderate";
    case 2: return "Less Safe";
    case 1: return "Unsafe";
    default: return "Unknown";
  }
};

export function StopBusynessTimeline({ busyTimes }: StopBusynessTimelineProps) {
  // Get current day of week (0-6, where 0 is Sunday)
  const currentDayOfWeek = new Date().getDay();
  const [selectedDay, setSelectedDay] = useState<string>(currentDayOfWeek.toString());
  
  // Get the unique days of week that have data
  const availableDays = [...new Set(busyTimes.map(time => time.day_of_week))].sort();
  
  // If the current day has no data, select the first available day
  useEffect(() => {
    if (!availableDays.includes(currentDayOfWeek) && availableDays.length > 0) {
      setSelectedDay(availableDays[0].toString());
    }
  }, [availableDays, currentDayOfWeek]);
  
  // Filter busy times for the selected day
  const filteredTimes = busyTimes.filter(time => time.day_of_week === parseInt(selectedDay));
  
  // Sort by hour of day
  const sortedTimes = [...filteredTimes].sort((a, b) => a.hour_of_day - b.hour_of_day);
  
  // Prepare chart data
  const chartData = sortedTimes.map(time => ({
    hour: formatHour(time.hour_of_day),
    busyness: time.busyness_level,
    safety: time.safety_level,
  }));

  const config = {
    busyness: {
      color: "#f97316", // orange-500
    },
    safety: {
      color: "#10b981", // emerald-500
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">Current Day: {DAYS_OF_WEEK[parseInt(selectedDay)]}</h3>
          {availableDays.length > 1 && (
            <Select value={selectedDay} onValueChange={setSelectedDay}>
              <SelectTrigger className="w-[180px] ml-4">
                <SelectValue placeholder="Change day" />
              </SelectTrigger>
              <SelectContent>
                {availableDays.map(day => (
                  <SelectItem key={day} value={day.toString()}>
                    {DAYS_OF_WEEK[day]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>Busyness</span>
          </div>
          <div className="flex items-center gap-1">
            <Shield className="h-4 w-4" />
            <span>Safety</span>
          </div>
        </div>
      </div>
      
      <div className="h-[300px] w-full">
        <ChartContainer config={config}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hour" />
            <YAxis domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} />
            <Tooltip />
            <Legend />
            <Bar dataKey="busyness" name="Busyness Level" fill="#f97316" />
            <Bar dataKey="safety" name="Safety Level" fill="#10b981" />
          </BarChart>
        </ChartContainer>
      </div>
      
      <div className="space-y-4">
        <h3 className="font-medium">Hourly Breakdown for {DAYS_OF_WEEK[parseInt(selectedDay)]}</h3>
        
        {sortedTimes.length === 0 ? (
          <p>No data available for this day.</p>
        ) : (
          <div className="grid gap-4">
            {sortedTimes.map((time) => (
              <Card key={time.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium">{formatHour(time.hour_of_day)}</h4>
                    <div className="flex gap-2">
                      <span className={`px-2 py-1 text-xs rounded-full text-white ${getBusynessColor(time.busyness_level)}`}>
                        Busyness: {getBusynessLabel(time.busyness_level)}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full text-white ${getSafetyColor(time.safety_level)}`}>
                        Safety: {getSafetyLabel(time.safety_level)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm flex items-center">
                          <Users className="h-4 w-4 mr-1" /> Busyness Level
                        </span>
                        <span className="text-sm">{time.busyness_level}/5</span>
                      </div>
                      <Progress value={time.busyness_level * 20} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm flex items-center">
                          <Shield className="h-4 w-4 mr-1" /> Safety Level
                        </span>
                        <span className="text-sm">{time.safety_level}/5</span>
                      </div>
                      <Progress value={time.safety_level * 20} className="h-2" />
                    </div>
                  </div>
                  
                  {time.busyness_level >= 4 && time.safety_level <= 2 && (
                    <div className="mt-3 flex items-center text-amber-600">
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      <span className="text-sm">High traffic, low safety - take caution during this time</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
