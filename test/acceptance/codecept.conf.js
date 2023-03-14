exports.config = {
  tests: './*_test.js',
  output: './output',
  helpers: {
    Puppeteer: {
      url: 'https://paypal05-tech-prtnr-na06-dw.demandware.net/s/RefArch/home?lang=en_US',
      show: true,
      windowSize: '1200x900',
      chrome: {
        args: [ '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
        ],
    },
    },
  },
  include: {
    I: './steps_file.js'
  },
  bootstrap: null,
  mocha: {},
  name: 'acceptance',
  plugins: {
    pauseOnFail: {},
    retryFailedStep: {
      enabled: true
    },
    tryTo: {
      enabled: true
    },
    screenshotOnFail: {
      enabled: true
    }
  }
}