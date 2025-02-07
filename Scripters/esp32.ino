#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "pratyush4g";
const char* password = "Omm@1234";
const char* supabaseUrl = "https://zamuorhmmvlyfcmjvxqs.supabase.co";
const char* supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphbXVvcmhtbXZseWZjbWp2eHFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg3NjUwMzIsImV4cCI6MjA1NDM0MTAzMn0.jZ4BVxaiygrH-W6WHq2ie0rsEo3taKhRTPlz5cto-mQ";
const char* telegramBotToken = "7722434679:AAEFzmK5qMpPykHXZHosWxa36JPvVooUfwY";
const char* telegramChatID = "5268185690"; 
const int RELAY_PIN = 26;
const int STATUS_LED = 2;
const int c_led = 27;
const int Buzzer = 25;

String currentSessionId = "";
String lastProcessedSessionId = "";  
bool isCharging = false;
unsigned long chargingStartTime = 0;
int currentDuration = 0;
int cost = 0;
unsigned long lastStatusCheck = 0;
const unsigned long statusCheckInterval = 5000; 

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(STATUS_LED, OUTPUT);
  pinMode(c_led, OUTPUT);
  pinMode(Buzzer, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH);
  digitalWrite(STATUS_LED, LOW);
  digitalWrite(c_led, LOW);
  digitalWrite(Buzzer, LOW);

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    digitalWrite(STATUS_LED, !digitalRead(STATUS_LED));
    delay(500);
  }
  digitalWrite(STATUS_LED, HIGH);
  delay(5000);
  digitalWrite(STATUS_LED, LOW);
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    if (!isCharging) {
      checkActiveChargingSessions();
    } else {
      // Check session status periodically
      if (millis() - lastStatusCheck >= statusCheckInterval) {
        checkCurrentSessionStatus();
        lastStatusCheck = millis();
      }
      
      // Check if duration has elapsed
      if ((millis() - chargingStartTime) >= (currentDuration * 60000UL)) {
        stopCharging();
      }
    }
  } else {
    WiFi.reconnect();
    digitalWrite(STATUS_LED, LOW);
    delay(1000);
  }

  if (!isCharging) {
    delay(1000);
  }
}

void checkActiveChargingSessions() {
  HTTPClient http;
  String url = String(supabaseUrl) + "/rest/v1/charging_sessions?status=eq.active&order=created_at.desc.nullslast&limit=1";
  http.begin(url);
  http.addHeader("apikey", supabaseKey);
  http.addHeader("Authorization", "Bearer " + String(supabaseKey));
  http.addHeader("Prefer", "return=representation");

  int httpCode = http.GET();
  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    DynamicJsonDocument doc(1024);
    DeserializationError error = deserializeJson(doc, payload);
    
    if (!error) {
      JsonArray array = doc.as<JsonArray>();
      if (array.size() > 0) {
        JsonObject session = array[0];
        String sessionId = session["id"].as<String>();
        if (sessionId != currentSessionId && sessionId != lastProcessedSessionId) {
          currentSessionId = sessionId;
          currentDuration = session["duration_minutes"].as<int>();
          cost = session["cost"].as<int>();
          startCharging();
        }
      }
    }
  } else {
    Serial.printf("HTTP Error: %d\n", httpCode);
  }
  http.end();
}

void checkCurrentSessionStatus() {
  if (currentSessionId == "") return;

  HTTPClient http;
  String url = String(supabaseUrl) + "/rest/v1/charging_sessions?id=eq." + currentSessionId;
  http.begin(url);
  http.addHeader("apikey", supabaseKey);
  http.addHeader("Authorization", "Bearer " + String(supabaseKey));

  int httpCode = http.GET();
  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    DynamicJsonDocument doc(1024);
    DeserializationError error = deserializeJson(doc, payload);
    
    if (!error) {
      JsonArray array = doc.as<JsonArray>();
      if (array.size() > 0) {
        JsonObject session = array[0];
        String status = session["status"].as<String>();
        
        if (status != "active") {
          Serial.println("Session stopped externally!");
          stopCharging();
        }
      }
    }
  }
  http.end();
}

void startCharging() {
  Serial.println("Starting new charging session!");
  Serial.print("Session ID: ");
  Serial.println(currentSessionId);
  Serial.print("Duration (minutes): ");
  Serial.println(currentDuration);
  
  isCharging = true;
  digitalWrite(c_led, HIGH);
  digitalWrite(Buzzer, HIGH);
  delay(2000); 
  digitalWrite(Buzzer, LOW);
  digitalWrite(RELAY_PIN, LOW);
  chargingStartTime = millis();
  
  for (int i = 0; i < 3; i++) {
    digitalWrite(STATUS_LED, LOW);
    delay(200);
    digitalWrite(STATUS_LED, HIGH);
    delay(200);
    digitalWrite(STATUS_LED, LOW);
  }
  
  sendTelegramMessage("🔋 Your EV charging session has started.\nSession ID: " + currentSessionId + "\nDuration: " + String(currentDuration) + " minutes.\nTotal cost: " + String(cost) + " rs");
}

void stopCharging() {
  Serial.println("Stopping charging session");
  digitalWrite(c_led, LOW);
  digitalWrite(RELAY_PIN, HIGH);
  digitalWrite(Buzzer, HIGH);
  delay(2000);
  digitalWrite(Buzzer, LOW);
  
  isCharging = false;
  updateSessionStatus(currentSessionId);  
  sendTelegramMessage("⚡ Your EV charging session is complete. Thank you!");  
  lastProcessedSessionId = currentSessionId;
  currentSessionId = "";
  currentDuration = 0;
  
  digitalWrite(STATUS_LED, HIGH);
  delay(5000);
  digitalWrite(STATUS_LED, LOW);
}

void updateSessionStatus(String sessionId) {
  HTTPClient http;
  String url = String(supabaseUrl) + "/rest/v1/charging_sessions?id=eq." + sessionId;
  http.begin(url);
  http.addHeader("apikey", supabaseKey);
  http.addHeader("Authorization", "Bearer " + String(supabaseKey));
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Prefer", "return=minimal");
  
  String patchData = "{\"status\":\"completed\"}";
  int httpCode = http.PATCH(patchData);
  http.end();
  delay(5000);
}

void sendTelegramMessage(String message) {
  HTTPClient http;
  String url = "https://api.telegram.org/bot" + String(telegramBotToken) + "/sendMessage";
  String postData = "chat_id=" + String(telegramChatID) + "&text=" + message;
  
  http.begin(url);
  http.addHeader("Content-Type", "application/x-www-form-urlencoded");
  int httpCode = http.POST(postData);
  http.end();
}
