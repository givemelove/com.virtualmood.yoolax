const { ZigBeeDevice } = require('homey-zigbeedriver');
const { Cluster, debug, CLUSTER } = require('zigbee-clusters');

class curtainmodule extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {

    this.printNode();

    if (this.isFirstInit()) {
      await this.configureAttributeReporting([
        {
          endpointId: 1,
          cluster: CLUSTER.POWER_CONFIGURATION,
          attributeName: 'batteryPercentageRemaining',
          minInterval: 65535,
          maxInterval: 0,
          minChange: 0,
        }
      ]);
    }

    this.registerCapability('windowcoverings_set', CLUSTER.WINDOW_COVERING, {
      reportOpts: {
        configureAttributeReporting: {
          minInterval: 1, // No minimum reporting interval
          maxInterval: 3600, // Maximally every ~8 hours
          minChange: 1, // Report when value changed by 5
        },
      },
    });

    await zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus'])
      .catch(err => {
        this.error('Error when reading device attributes ', err);
      });

    // measure_battery // alarm_battery
    zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME]
      .on('attr.batteryPercentageRemaining', this.onBatteryPercentageRemainingAttributeReport.bind(this));

  }

  onBatteryPercentageRemainingAttributeReport(batteryPercentageRemaining) {
    const batteryThreshold = this.getSetting('batteryThreshold') || 20;
    this.log('measure_battery | powerConfiguration - batteryPercentageRemaining (%): ', batteryPercentageRemaining / 2);
    this.setCapabilityValue('measure_battery', batteryPercentageRemaining / 2)
      .catch(this.error);
    this.setCapabilityValue('alarm_battery', (batteryPercentageRemaining / 2 < batteryThreshold) ? true : false)
      .catch(this.error);
  }

  onDeleted() {
    this.log('Curtain Module removed');
  }

}

module.exports = curtainmodule;
