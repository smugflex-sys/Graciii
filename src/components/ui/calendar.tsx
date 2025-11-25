"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
// Lightweight calendar fallback to avoid heavy peer deps

import { cn } from "./utils";
import { buttonVariants } from "./button";

function Calendar({ className, ...props }: { className?: string; onChange?: (date: Date) => void }) {
  return (
    <div className={cn("p-3", className)}>
      <div className="flex items-center gap-2">
        <button className={cn(buttonVariants({ variant: "outline" }), "size-7 p-0")}>
          <ChevronLeft className="size-4" />
        </button>
        <input
          type="date"
          className={cn(buttonVariants({ variant: "ghost" }), "h-8 px-2 text-sm border rounded-md")}
          onChange={(e) => props.onChange?.(new Date(e.target.value))}
        />
        <button className={cn(buttonVariants({ variant: "outline" }), "size-7 p-0")}>
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

export { Calendar };
