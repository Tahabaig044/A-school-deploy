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
    <AlertDialogContext.Provider value={{ open, setOpen }}>
      {children}
    </AlertDialogContext.Provider>
  )
}

function AlertDialogTrigger({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) {
  const { setOpen } = React.useContext(AlertDialogContext)
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<React.HTMLAttributes<HTMLElement>>, {
      onClick: (e: React.MouseEvent<HTMLElement>) => {
        setOpen(true)
        const originalOnClick = (children as React.ReactElement<React.HTMLAttributes<HTMLElement>>).props.onClick
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
      <div className="relative bg-background rounded-lg shadow-lg p-6 max-w-md w-full mx-4 z-50">
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
  return <p className="text-sm text-muted-foreground mt-1">{children}</p>
}

function AlertDialogFooter({ children }: { children: React.ReactNode }) {
  return <div className="flex justify-end gap-2 mt-4">{children}</div>
}

function AlertDialogCancel({ children }: { children: React.ReactNode }) {
  const { setOpen } = React.useContext(AlertDialogContext)
  return (
    <button
      className="px-4 py-2 text-sm rounded-md border bg-background hover:bg-accent"
      onClick={() => setOpen(false)}
    >
      {children}
    </button>
  )
}

function AlertDialogAction({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  const { setOpen } = React.useContext(AlertDialogContext)
  return (
    <button
      className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
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
