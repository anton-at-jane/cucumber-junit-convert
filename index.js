const builder = require('junit-report-builder');
const fs = require('fs');
const jsonFile = require('jsonfile');

function convert(options) {
  const jsonFileResult = jsonFile.readFileSync(options.inputJsonFile);
  const reportBuilder = builder.newBuilder();
  const suite = reportBuilder.testSuite().name("all");
  let suiteDuration = 0;
  jsonFileResult.forEach(function(feature) {
    let durationInSec = 0;

    const testCase = suite.testCase().name(feature.name).file(feature.uri);

    feature.elements.forEach(function(scenario) {
      if (scenario.type == 'background') {
        return;
      }

      const result = getScenarioSummary(scenario, options);

      if (result.status === 'failed') {
        if (result.embeddings.length) {
          testCase
            .standardError(result.message)
            .errorAttachment(result.embeddings[0])
            .failure(result.message);
        } else {
          testCase.failure(result.message);
        }
      } else if (result.status === 'skipped') {
        testCase.skipped();
      }

      durationInSec += result.duration;
    });

    testCase.time(durationInSec);
    suiteDuration += durationInSec;
  });
  suite.time(suiteDuration);
  reportBuilder.writeTo(options.outputXmlFile);
}

function getScenarioSummary(scenario, options) {
  let status = 'passed';
  let message = null;
  let duration = 0;
  let embeddings = [];

  scenario.steps.forEach(function(step) {
    if (step.result.duration) {
      duration += step.result.duration;
    }

    if (step.embeddings && step.embeddings.length > 0) {
      embeddings.push(step.embeddings[0].data);
    }

    if (step.result.status == 'failed' || !!options.failOnUndefinedStep && step.result.status == 'undefined') {
      status = 'failed';
      message = step.result.error_message;
    } else if (
      status == 'passed' &&
      (step.result.status == 'pending' || step.result.status == 'skipped')
    ) {
      status = 'skipped';
    }
  });
  const durationInSec = duration / 1000000000; //ns to sec

  return {
    status: status,
    message: message,
    duration: durationInSec,
    embeddings
  };
}

module.exports = {
  convert: convert
};
