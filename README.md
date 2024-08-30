# Marine Traffic to Home Assistant

## Description

The **Marine Traffic to Home Assistant** extension scrapes data from your AIS web dashboard and transmits it to Home Assistant (HA) for seamless integration of maritime traffic information into your smart home system. This extension periodically sends data such as the number of vessels, the number of Class A and Class B vessels, uptime, a screenshot of the map encoded in base64 (PNG format), and other information directly to your HA instance.

Work ONLY for web dashboards similar to RSK400Ni SRT - CX4

![image](https://github.com/user-attachments/assets/85e73293-6543-4152-90a7-eeff736ebd67)

---

## Home Assistant Configuration

### 1. **Configure CORS to Allow Transmissions**

To allow your Home Assistant instance to accept transmissions from the Chrome extension, you need to configure CORS (Cross-Origin Resource Sharing) origins to permit access from the IP address or domain where the transmission originates.

Add the following lines to the `http:` configuration in your `configuration.yaml` file in Home Assistant:

```yaml
http:
  ssl_certificate: /ssl/fullchain.pem
  ssl_key: /ssl/privkey.pem
  cors_allowed_origins:
    - "http://192.168.137.2"  # Replace with the exact origin from where the extension is running. You can also see the console with cors error and find out the address.
    - "https://xxx.duckdns.org" #your HA instance
```

Replace the IP address and domain with those you use to access your HA instance.

### 2. **Add Entities to Home Assistant**

To utilize the data sent by the extension, you need to add custom entities in Home Assistant. Add the following lines to your `configuration.yaml` file under the `template` section:

```yaml
template:
  - sensor:
      - name: "Vessel Count Stability"
        state: >
          {% set v1 = states('sensor.vessel_count') %}
          {% set v2 = states.sensor.vessel_count.attributes.previous_v2 %}
          {% set v3 = states.sensor.vessel_count.attributes.previous_v3 %}
          {% if v1 == v2 and v2 == v3 %}
            stable
          {% else %}
            changing
          {% endif %}
        attributes:
          previous_v2: "{{ states('sensor.vessel_count') }}"
          previous_v3: "{{ state_attr('sensor.vessel_count_stability', 'previous_v2') }}"
          
      - name: "Class A Vessels"
        unit_of_measurement: "vessels"
        state: "{{ state_attr('sensor.vessel_count', 'class_a_count') | int }}"

      - name: "Class B Vessels"
        unit_of_measurement: "vessels"
        state: "{{ state_attr('sensor.vessel_count', 'class_b_count') | int }}"

      - name: "Vessel Uptime"
        state: "{{ state_attr('sensor.vessel_count', 'uptime') }}"
        
      - name: "Transmission Date"  
        state: "{{ state_attr('sensor.vessel_count', 'transmission_date') }}" 
```

### 3. **Create an API Key in Home Assistant**

To allow the extension to send data to Home Assistant, you need to create an API key. Here are the steps:

1. **Access Home Assistant**:
   - Log in to your Home Assistant interface.

2. **Go to Your User Profile**:
   - Click on your username at the bottom left to access your profile.

3. **Create an API Key**:
   - Scroll down to the **Long-Lived Access Tokens** section.
   - Click **Create Token**.
   - Give the token a name (e.g., "Marine Traffic to HA") and click **OK**.
   - Copy the generated API key. **Note:** You will not be able to see this key again, so make sure to copy and store it securely.

4. **Add this API Key to the Chrome Extension**:
   - Open the Chrome extension and paste the API key into the appropriate field during configuration.

---

## Installing and Configuring the Chrome Extension

### 1. **Installing the Extension**

1. **Download the Extension**:
   - You can download the extension from the Chrome Web Store or load it in developer mode from the GitHub repository.

2. **Load the Extension in Developer Mode (if necessary)**:
   - Go to `chrome://extensions/` in your Chrome browser.
   - Enable `Developer mode`.
   - Click `Load unpacked` and select the folder containing your extension.

### 2. **Configuring the Extension**

1. **Open the Extension**:
   - Click on the extension icon in the Chrome toolbar to open the configuration panel.

2. **Enter Your Home Assistant URL**:
   - In the `Home Assistant URL` field, enter the full URL of your Home Assistant instance, including the port if necessary.

3. **Enter Your Home Assistant API Key**:
   - Paste the API key you generated in Home Assistant.

4. **Set the Automatic Sending Interval**:
   - Specify the frequency, in minutes, at which the extension should send data to Home Assistant.

5. **Enable Automatic Sending**:
   - Check the `Enable Automatic Sending` box to activate automatic data sending.

6. **Save the Settings**:
   - Click `Save Settings` to save your settings. A transmission will automatically be triggered when automatic sending is enabled.

7. **Test the Connection**:
   - Click `Test Connection` to verify that the connection with Home Assistant is correctly established.

### 3. **Getting Started**

Once the extension is configured and settings are saved:

- **Automatic Transmission**: The extension will send data at the specified interval, including a screenshot of the Marine Traffic map encoded in base64 PNG format, which can be displayed in your Home Assistant interface.
- **Logs**: You can view logs in the extension interface to verify transmissions and troubleshoot any issues.
- **Log Cleaning**: Configure the frequency of automatic log cleaning according to your needs.

---

## Adding Cards to Your Home Assistant Dashboard

To visualize the data in Home Assistant, you can use the following card templates in your dashboard:

```yaml
- type: grid
  cards:
    - type: custom:mini-graph-card
      entities:
        - entity: sensor.vessel_count
          name: 🚢
          color: '#00ff00'
          show_state: false
        - entity: sensor.class_a_vessels
          name: Class A Vessels
          color: '#ff5733'
          show_state: true
          show_graph: true
          state_adaptive_color: true
          attributes:
            unit_of_measurement: vessels
        - entity: sensor.class_b_vessels
          name: Class B Vessels
          color: '#33c1ff'
          show_state: true
          show_graph: true
          state_adaptive_color: true
          attributes:
            unit_of_measurement: vessels
      hours_to_show: 24
      smoothing: true
      show:
        legend: false
        labels: false
    - type: tile
      entity: sensor.class_a_vessels
      icon: mdi:ferry
    - type: tile
      entity: sensor.vessel_uptime
      icon: mdi:clock-time-five-outline
      vertical: true
      hide_state: false
      show_entity_picture: false
    - type: tile
      entity: sensor.class_b_vessels
      icon: mdi:sail-boat
    - type: markdown
      content: |
        ![Map Image]({{ state_attr('sensor.vessel_count', 'map_image') }})
    - type: tile
      entity: sensor.transmission_date
      layout_options:
        grid_columns: 4
        grid_rows: 1
    - type: markdown
      content: |
        ![Map Image](https://www.dxinfocentre.com/tr_map/fcst/eur006.png)
  title: Marine Traffic
```

These cards will allow you to visualize information on vessels, uptime, and the base64-encoded map directly on your Home Assistant dashboard.

---

## Troubleshooting

### 1. **Connection Fails**
   - Check the URL of your Home Assistant and the API key.
   - Ensure that your Home Assistant instance is accessible from the IP address or domain used by the extension.

### 2. **Data Is Not Updating in Home Assistant**
   - Ensure that the extension is configured correctly.
   - Check the logs in the extension for any errors during transmission.

### 3. **Logs Are Not Displaying Correctly**
   - Try clearing the logs and restarting the extension.

---

## Contributions

Contributions to this project are welcome. If you would like to report a bug, suggest an improvement, or collaborate, feel free to open an issue or submit a pull request on GitHub.

---

## License

This project is licensed under the MIT License. See the LICENSE file for more details.

---

This documentation provides users with a clear understanding of the required configuration in Home Assistant, the creation of an API key, the installation and use of the Chrome extension, and troubleshooting steps in case of issues. If you need further information or adjustments, feel free to let me know!
