// Force Railway deployment by updating timestamp
// This file exists solely to trigger a fresh deployment
// when Railway security scans are blocking normal deployments

const deploymentInfo = {
  timestamp: new Date().toISOString(),
  reason: "Force deployment after Next.js security fixes",
  nextjsVersion: "14.2.35",
  securityFixes: [
    "CVE-2025-55184 (GHSA-mwv6-3258-q52c)",
    "CVE-2025-67779 (GHSA-5j59-xgg2-r9c4)"
  ],
  competitorFix: "Viewport event handlers added for auto-loading",
  buildNumber: Math.floor(Date.now() / 1000)
};

console.log("Railway Deployment Force Trigger:", deploymentInfo);

module.exports = deploymentInfo;