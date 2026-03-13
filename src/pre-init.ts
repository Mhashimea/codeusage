// Pre-init module - this must be imported FIRST to set up environment
// before any color-aware libraries are loaded

// Early detection of --no-color flag
if (process.argv.includes('--no-color') || process.env.NO_COLOR) {
  process.env.NO_COLOR = '1';
  process.env.FORCE_COLOR = '0';
}
