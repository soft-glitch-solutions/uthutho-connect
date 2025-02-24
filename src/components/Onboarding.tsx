
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Bus, Car, Train } from "lucide-react";
import { useNavigate } from "react-router-dom";

const slides = [
  {
    title: "Welcome to Uthutho",
    description: "For commuters, by commuters",
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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md animate-fadeIn">
        <div className="flex flex-col items-center mb-8">
          <img src="/logo.png" alt="Uthutho" className="h-16 mb-2" />
          <span className="text-2xl font-bold text-primary">
            Uthutho
          </span>
          <span className="text-sm text-foreground/80">
            For commuters, by commuters
          </span>
        </div>

        <Card className="p-6 bg-background/50 backdrop-blur-sm border border-primary/20">
          <div className="flex justify-center mb-6">
            {slides.map((_, index) => (
              <div
                key={index}
                className={`h-1 w-8 mx-1 rounded-full transition-colors ${
                  index === currentSlide ? "bg-primary" : "bg-foreground/10"
                }`}
              />
            ))}
          </div>

          <div className="text-center mb-8">
            <div className="flex justify-center mb-4 h-16 relative">
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
            <h2 className="text-xl font-semibold mb-2 text-foreground">
              {slides[currentSlide].title}
            </h2>
            <p className="text-foreground/60">
              {slides[currentSlide].description}
            </p>
          </div>

          <Button
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white transition-colors"
            onClick={nextSlide}
          >
            {currentSlide === slides.length - 1 ? "Get Started" : "Next"}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Card>

        <div className="mt-4 text-center">
          <p className="text-sm text-foreground/60">
            Developed by Soft Glitch Solutions
          </p>
        </div>
      </div>
    </div>
  );
}
