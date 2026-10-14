import { cn } from "cn"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "relative overflow-hidden rounded-md bg-slate-800/80",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.4s_infinite]",
        "before:bg-gradient-to-r before:from-transparent before:via-slate-700/50 before:to-transparent",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
