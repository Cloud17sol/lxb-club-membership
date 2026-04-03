import { Toaster as Sonner } from "sonner"

const Toaster = ({ ...props }) => {
  return (
    <Sonner
      theme="dark"
      richColors
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "group toast",
          description: "group-[.toast]:text-[#A0A0AB]",
          actionButton:
            "group-[.toast]:bg-[#FF5722] group-[.toast]:text-white",
          cancelButton:
            "group-[.toast]:bg-[#2a2a32] group-[.toast]:text-[#A0A0AB]",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
