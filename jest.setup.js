// Jest setup for Node.js environment tests

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/test',
      query: {},
      asPath: '/test',
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/test'
  }
}))

// Setup global test configurations
global.fetch = jest.fn()

// Increase test timeout for integration tests
jest.setTimeout(30000)

// Mock performance API if not available
if (!global.performance) {
  global.performance = {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByType: jest.fn(() => []),
    getEntriesByName: jest.fn(() => [])
  }
}

// Mock process.memoryUsage for performance tests
const originalMemoryUsage = process.memoryUsage
process.memoryUsage = jest.fn(() => ({
  rss: 4935680,
  heapTotal: 1826816,
  heapUsed: 650472,
  external: 49879,
  arrayBuffers: 9386
}))

// Restore original functions after tests
afterAll(() => {
  process.memoryUsage = originalMemoryUsage
})