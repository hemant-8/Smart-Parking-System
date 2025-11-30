# Smart-Parking-System
Automatic Number Plate Recognition Based Parking Management System

## Overview
This project implements a complete automatic parking management solution using OCR based number plate recognition. A Raspberry Pi continuously captures vehicle number plates using a connected camera, sends the plate region to an OCR server, and receives the decoded number. The system interacts with Firebase Realtime Database to manage pending entries, active sessions, slot statuses, parking fee calculation, and parking history.  
A web dashboard provides approval control for entry, automated exit detection, slot status monitoring, and the ability to download session receipts.

## Hardware Components
1. Raspberry Pi with Camera Module or USB camera  
2. Stable internet connectivity  
3. Access to Raspberry Pi through monitor or VNC  
4. Power supply for Raspberry Pi  

## Software Requirements
1. Python 3  
2. OpenCV library for video capture and plate detection  
3. Firebase Realtime Database (configured with authentication secret)  
4. OCR server responding to POST requests for extracting plate numbers  
5. License plate Haar cascade file for detection

The cascade XML file required for plate detection can be downloaded from the following source:
https://github.com/SarthakV7/AI-based-indian-license-plate-detection/blob/master/indian_license_plate.xml

## System Operation
1. The Haar cascade XML is loaded by OpenCV. The script exits if loading fails.  
2. Video stream is opened and configured for frame resolution.  
3. Number plate detection is performed frame by frame using the cascade classifier.  
4. Each detected candidate is cropped and sent to the OCR server for text recognition.  
5. A streak system confirms valid recognition only after the same number appears in at least two consecutive frames to reduce false detections.  
6. When a valid detection occurs:
   - Firebase is checked to determine whether this plate is currently active.
   - If the plate exists in active_parking, the vehicle is marked as exited:
     - Duration is calculated from entry_time to exit_time
     - Parking fee is computed (Rs 50 for up to one hour, Rs 50 per additional hour)
     - Data is written into parking_history
     - Slot is marked as EMPTY and the entry in active_parking is deleted
   - If the plate is not active, the detection is treated as a new entry request:
     - A record is created under pending_entries with timestamp
     - Approval is done later through the dashboard
7. The camera feed with detection rectangle is displayed live.  
8. Press Escape to stop the system and release the camera.

## Web Dashboard Workflow
1. Newly detected plates appear in the Pending section  
2. Administrator can approve or reject vehicle entry  
3. When approved:
   - A free slot is assigned
   - Active parking entry is created with timestamp
   - Initial fee recorded as Rs 50  
4. When the same plate is detected again:
   - Exit is processed automatically
   - Fee is recalculated based on total duration  
5. All completed sessions can be viewed and receipts can be downloaded from the History section  
6. Dashboard displays overall status including:
   - Number of slots
   - Occupied versus free slots
   - Revenue statistics  

## Usage Instructions
1. Start the OCR server before running the program  
2. Ensure Raspberry Pi camera is positioned toward the vehicle number plate  
3. Open the terminal and run:
   python3 final.py  
4. When a plate is detected, the recognized number appears in the terminal  
5. Open the website dashboard to approve entry requests and view system data  

## Main Program Code (final.py)
(Already included in this repository)
