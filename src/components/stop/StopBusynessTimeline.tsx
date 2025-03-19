
import { useState, useEffect } from "react";
import { 
  Card, 
  CardContent
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Users, Shield, Clock, Calendar } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const isMobile = useIsMobile();
  // Get current day of week (0-6, where 0 is Sunday) and current hour
  const currentDate = new Date();
  const currentDayOfWeek = currentDate.getDay();
  const currentHour = currentDate.getHours();
  
  // Filter busy times for the current day
  const todaysTimes = busyTimes.filter(time => time.day_of_week === currentDayOfWeek);
  
  // Find the current hour's data if available
  const currentTimeData = todaysTimes.find(time => time.hour_of_day === currentHour);
  
  // Find the closest time data if exact match not available
  const findClosestTimeData = () => {
    if (todaysTimes.length === 0) return null;
    
    // Sort by how close the hour is to current hour
    const sortedByCloseness = [...todaysTimes].sort((a, b) => {
      const diffA = Math.abs(a.hour_of_day - currentHour);
      const diffB = Math.abs(b.hour_of_day - currentHour);
      return diffA - diffB;
    });
    
    return sortedByCloseness[0];
  };
  
  // Use exact match or closest time
  const timeData = currentTimeData || findClosestTimeData();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <h3 className="font-medium text-sm sm:text-base">
            {DAYS_OF_WEEK[currentDayOfWeek]}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span className="text-sm sm:text-base">{formatHour(currentHour)}</span>
        </div>
      </div>
      
      {!timeData ? (
        <Card className="overflow-hidden bg-gray-50">
          <CardContent className="p-4">
            <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mb-2" />
              <p>No data available for the current time.</p>
              <p className="text-sm">Check back later or view another time.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <CardContent className={`p-4 ${isMobile ? 'space-y-3' : 'space-y-4'}`}>
            <div className="flex justify-between items-center mb-1">
              <h4 className="font-medium">
                {timeData === currentTimeData 
                  ? 'Current Status' 
                  : `Closest Data (${formatHour(timeData.hour_of_day)})`
                }
              </h4>
              <div className="flex gap-2">
                <span className={`px-2 py-1 text-xs rounded-full text-white ${getBusynessColor(timeData.busyness_level)}`}>
                  {getBusynessLabel(timeData.busyness_level)}
                </span>
                <span className={`px-2 py-1 text-xs rounded-full text-white ${getSafetyColor(timeData.safety_level)}`}>
                  {getSafetyLabel(timeData.safety_level)}
                </span>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm flex items-center">
                    <Users className="h-4 w-4 mr-1" /> Busyness
                  </span>
                  <span className="text-sm">{timeData.busyness_level}/5</span>
                </div>
                <Progress value={timeData.busyness_level * 20} className="h-2" />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm flex items-center">
                    <Shield className="h-4 w-4 mr-1" /> Safety
                  </span>
                  <span className="text-sm">{timeData.safety_level}/5</span>
                </div>
                <Progress value={timeData.safety_level * 20} className="h-2" />
              </div>
            </div>
            
            {timeData.busyness_level >= 4 && timeData.safety_level <= 2 && (
              <div className="mt-2 flex items-center text-amber-600 bg-amber-50 p-2 rounded-md text-sm">
                <AlertTriangle className="h-4 w-4 mr-1 flex-shrink-0" />
                <span>High traffic, low safety - take caution</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
