import bcrypt from 'bcryptjs'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}))

describe('Authentication', () => {
  describe('Password hashing', () => {
    it('should hash passwords correctly', async () => {
      const password = 'testpassword123'
      const hashedPassword = await bcrypt.hash(password, 12)
      
      expect(hashedPassword).toBeDefined()
      expect(hashedPassword).not.toBe(password)
      expect(hashedPassword.length).toBeGreaterThan(50)
    })

    it('should verify passwords correctly', async () => {
      const password = 'testpassword123'
      const hashedPassword = await bcrypt.hash(password, 12)
      
      const isValid = await bcrypt.compare(password, hashedPassword)
      const isInvalid = await bcrypt.compare('wrongpassword', hashedPassword)
      
      expect(isValid).toBe(true)
      expect(isInvalid).toBe(false)
    })
  })
})

export {}