//const database = require('./database.cjs');
const filemanager = require('./filemanager.cjs');

const getReadableTimestamp = () => {
    return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'medium',
        timeZone: 'UTC',
    }).format(new Date());
};

const logger = {
    info: (...args) => console.log(`🚀 |  🔧 [${getReadableTimestamp}] INFO:`, ...args),
    error: (...args) => console.error(`🚀 | ❌ [${getReadableTimestamp}] ERROR:`, ...args),
    warn: (...args) => console.warn(`⚠️ [${getReadableTimestamp}] WARN:`, ...args),
    debug: (...args) => console.debug(`🚀 | 🔍 [${getReadableTimestamp}] DEBUG:`, ...args)
};

(async () => {
    try {
        logger.info("Starting all backend servers...");
        
        logger.info("All servers started successfully");

        process.on('SIGINT', () => {
            logger.info("Shutting down servers...");
            process.exit(0);
        });
    } catch (error) {
        logger.error("Failed to start servers:", error);
        process.exit(1);
    }
})();
