const path = require('path');
const { tests } = require('@iobroker/testing');

const mysqlMock = {
	createConnection() {
		return {
			connect() { },
			query() { },
			end() { },
		};
	}
}

const sqliteMock = {
	verbose() { return sqliteMock },
	Database: class {
		constructor() { }
		all() { }
		close() { }
	}
}

// Run unit tests - See https://github.com/ioBroker/testing for a detailed explanation and further options
tests.unit(path.join(__dirname, '..'), {
	allowedExitCodes: [11], additionalMockedModules: {
		"mysql": mysqlMock,
		"sqlite3": sqliteMock,
	}
});
