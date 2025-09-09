# seldriven API

Design @
https://docs.google.com/document/d/1HIVARxf_lxR7xpVL0u-zYLMMwDEepaDesblXPrWUlQ4
https://slfdrvn.io/apps

# SSI
https://slfdrvn.io/trust

# Tech
https://learn.entityos.cloud/learn-function-automation

Works with the AWS API Gateway.

Data format from API Gateway:

{
	"body":
	{
		"apikey": "[user-id]",
		"authkey": "[user-password]",
		"method": "[your domain specific method name]"
	},
	"queryStringParameters": {},
	"headers": {}
}