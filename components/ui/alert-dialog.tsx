"use client"

import * as React from "react"

interface AlertDialogContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

const AlertDialogContext = React.createContext<AlertDialogContextValue>({
  open: false,
  setOpen: () => {},
})

function AlertDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  return (
    <AlertDialogContext.Provider value={{ open, setOpen }}>{children}</AlertDialogContext.Provider>
  )
}

function AlertDialogTrigger({
  children,
  asChild,
}: {
  children: React.ReactNode
  asChild?: boolean
}) {
  const { setOpen } = React.useContext(AlertDialogContext)
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<React.HTMLAttributes<HTMLElement>>, {
      onClick: (e: React.MouseEvent<HTMLElement>) => {
        setOpen(true)
        const originalOnClick = (children as React.ReactElement<React.HTMLAttributes<HTMLElement>>)
          .props.onClick
        if (originalOnClick) originalOnClick(e)
      },
    })
  }
  return <button onClick={() => setOpen(true)}>{children}</button>
}

function AlertDialogContent({ children }: { children: React.ReactNode }) {
  const { open, setOpen } = React.useContext(AlertDialogContext)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={() => setOpen(false)} />
      <div className="bg-background relative z-50 mx-4 w-full max-w-md rounded-lg p-6 shadow-lg">
        {children}
      </div>
    </div>
  )
}

function AlertDialogHeader({ children }: { children: React.ReactNode }) {
  return <div className="mb-4">{children}</div>
}

function AlertDialogTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold">{children}</h2>
}

function AlertDialogDescription({ children }: { children: React.ReactNode }) {
  return <p className="text-muted-foreground mt-1 text-sm">{children}</p>
}

function AlertDialogFooter({ children }: { children: React.ReactNode }) {
  return <div className="mt-4 flex justify-end gap-2">{children}</div>
}

function AlertDialogCancel({ children }: { children: React.ReactNode }) {
  const { setOpen } = React.useContext(AlertDialogContext)
  return (
    <button
      className="bg-background hover:bg-accent rounded-md border px-4 py-2 text-sm"
      onClick={() => setOpen(false)}
    >
      {children}
    </button>
  )
}

function AlertDialogAction({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
}) {
  const { setOpen } = React.useContext(AlertDialogContext)
  return (
    <button
      className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm disabled:opacity-50"
      onClick={() => {
        onClick?.()
        setOpen(false)
      }}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
}
