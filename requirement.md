my client found many bugs :

1) Check Sql injection    

like even if user is entering ", ;" or just any char it is taking , should not happen with any details . 

2) Check Rate Limiting      
for account creation or for something i dont know for what client said

3) Keep Captcha      
while creating account they should verify captcha                                                                                                   
4)Multiple  Entries for Each Constituency , like if some one is already a assembly coordinator for some location and if i try to add other person as assembly cordinator for same location then it should say someone is already existing so cant create another one . 


5) Excel Download(Loading status ) put delay at api for  2 sec so tat it wont go repetitive stages 
like if clicked on download excelsheet it is downloading after some time and user thinks that as a glitch and clicks on download for multiple times and the file gets downloaded multiple times 
6) Profile completion   
at profile Active Family Member in the Party is optional , keep it optional but if those details are not entered consider it in profile completion percentage . if not entered then it should not go to 100% , and for Professional & Social give weightage for each social media link . like consider each link into percentage (if its already there then leave it )
7)Auto Deletion of  Events after 7 days should not be done , let the events data stay even after 7 days it should not wipe out from the database                                       
8) List down previous suggestion 

for user show their own suggestions that are sent to admin in feedback section 
and show  thank you customised message after submitting