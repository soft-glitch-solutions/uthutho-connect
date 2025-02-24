import { Card } from "@/components/ui/card";

export function HubSkeleton() {
  return (
    <Card className="p-4 cursor-pointer">
      <div className="animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
      </div>
    </Card>
  );
}