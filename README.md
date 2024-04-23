## Bedrock User Share Snapshot

To get all users' share for a block `<BLOCK_NUMBER>`, a SQL query inside data studio can be used:

```sql
SELECT 
    account, 
    SUM(share) AS accountShare 
FROM 
    (
        SELECT 
            account, 
            share, 
            label, 
            ROW_NUMBER() OVER (
                PARTITION BY account, label 
                ORDER BY block_number DESC, log_index DESC
            ) AS rn 
        FROM 
            user_share 
        WHERE 
            block_number <= <BLOCK_NUMBER>
    ) 
WHERE 
    rn = 1 
GROUP BY 
    account;
```