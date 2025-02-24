
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Bus, Car, Train } from "lucide-react";
import { useNavigate } from "react-router-dom";

const slides = [
  {
    title: "Welcome to Uthutho",
    description: "Your smart urban transport companion",
    icon: Car,
    color: "text-transport-taxi",
  },
  {
    title: "Plan Your Journey",
    description: "Find the best routes and transport options",
    icon: Bus,
    color: "text-transport-bus",
  },
  {
    title: "Stay Connected",
    description: "Get real-time updates and travel insights",
    icon: Train,
    color: "text-transport-train",
  },
];

export function Onboarding() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();

  const nextSlide = () => {
    if (currentSlide === slides.length - 1) {
      navigate("/auth");
    } else {
      setCurrentSlide((prev) => prev + 1);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-white to-gray-50">
      <div className="w-full max-w-md animate-fadeIn">
        <div className="flex justify-center mb-8">
          <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-transport-bus via-transport-taxi to-transport-train">
            Uthutho
          </span>
        </div>

        <Card className="p-6 backdrop-blur-sm bg-white/80 shadow-lg border-0">
          <div className="flex justify-center mb-6">
            {slides.map((_, index) => (
              <div
                key={index}
                className={`h-1 w-8 mx-1 rounded-full transition-colors ${
                  index === currentSlide ? "bg-primary" : "bg-gray-200"
                }`}
              />
            ))}
          </div>

          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              {slides.map((slide, index) => {
                const Icon = slide.icon;
                return (
                  <div
                    key={index}
                    className={`transition-all duration-500 absolute ${
                      index === currentSlide
                        ? "opacity-100 transform scale-100"
                        : "opacity-0 transform scale-95"
                    }`}
                    style={{
                      display: index === currentSlide ? "block" : "none",
                    }}
                  >
                    <Icon className={`w-16 h-16 ${slide.color}`} />
                  </div>
                );
              })}
            </div>
            <h2 className="text-xl font-semibold mb-2">
              {slides[currentSlide].title}
            </h2>
            <p className="text-gray-600">
              {slides[currentSlide].description}
            </p>
          </div>

          <Button
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-transport-bus to-transport-train hover:opacity-90 transition-opacity"
            onClick={nextSlide}
          >
            {currentSlide === slides.length - 1 ? "Get Started" : "Next"}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Card>

        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500">
            Developed by Soft Glitch Solutions
          </p>
        </div>
      </div>
    </div>
  );
}
