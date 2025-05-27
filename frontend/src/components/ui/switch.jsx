import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils"; // Remplace cette fonction si tu ne l'as pas

const switchVariants = cva(
    "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out disabled:cursor-not-allowed disabled:opacity-50",
    {
        variants: {
            checked: {
                true: "bg-primary",
                false: "bg-input",
            }
        }
    }
);

const circleVariants = cva(
    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out",
    {
        variants: {
            checked: {
                true: "translate-x-5",
                false: "translate-x-0"
            }
        }
    }
);

const Switch = React.forwardRef(({ className, checked, onChange, ...props }, ref) => {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange && onChange(!checked)}
            className={cn(switchVariants({ checked }), className)}
            ref={ref}
            {...props}
        >
            <span className={circleVariants({ checked })} />
        </button>
    );
});

Switch.displayName = "Switch";

export { Switch };
