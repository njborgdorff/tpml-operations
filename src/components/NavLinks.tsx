'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/finished', label: 'Finished' },
]

export function NavLinks() {
  const pathname = usePathname()

  return (
    <nav aria-label="Main navigation" className="flex items-center space-x-4">
      {links.map((link) => {
        const isActive = pathname === link.href
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`text-sm font-medium transition-colors hover:text-foreground ${
              isActive ? 'text-foreground' : 'text-muted-foreground'
            }`}
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
