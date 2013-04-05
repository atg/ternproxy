//
//  CSAPICall.m
//  CSKit
//
//  Created by Nicholas Penree on 9/25/08.
//  Copyright 2008 Conceited Software. All rights reserved.
//

#import "CSAPICall.h"
#import "NSMutableData+CSAPI.h"

NSString *CSStatusKey = @"status";
NSString *CSPassValue = @"success";
NSString *CSFailValue = @"fail";
CGFloat CSAPICallTimeout = 30.0;

@interface CSAPICall ()
+ (dispatch_queue_t)APIQueue;
@end


@implementation CSAPICall
{
  BOOL isCancelled;
}

@synthesize request, responseString, responseData, responseDictionary, responseArray, enableDebug, status, url, isCompleted, callArgs, HTTPMethod, runTime, queryTime, headerFields, responseError, block, POSTType;

+ (dispatch_queue_t)APIQueue
{
	static dispatch_queue_t APIQueue = nil;
	static dispatch_once_t onceToken;
	dispatch_once(&onceToken, ^{
		APIQueue = dispatch_queue_create("net.conceited.Basil.APIQueue", DISPATCH_QUEUE_CONCURRENT);
	});
	
	return APIQueue;
}

+ (id)GETCall
{
	CSAPICall *call = [self new];
	call.HTTPMethod = @"GET";
	return call;
}

+ (id)POSTCall
{
	CSAPICall *call = [self new];
	call.HTTPMethod = @"POST";
	return call;
}

//+ (CSAPICall *)callWithURL:(NSString *)url
//{
//	return [[self class] callWithURL:url fields:nil];
//}
//
//+ (CSAPICall *)callWithURL:(NSString *)url fields:(NSDictionary *)_args
//{
//	return [[self class] POSTCallWithURL:url fields:nil];
//}

+ (CSAPICall *)GETCallWithURL:(NSString *)url fields:(NSDictionary *)_args
{
	CSAPICall *call = [[[self class] alloc] init];
	call.url = url;
	call.callArgs = _args;
	call.HTTPMethod = @"GET";
	return call;
}

+ (CSAPICall *)POSTCallWithURL:(NSString *)url fields:(NSDictionary *)_args
{
	CSAPICall *call = [[[self class] alloc] init];
	call.url = url;
	call.callArgs = _args;
	call.HTTPMethod = @"POST";
	call.POSTType = CSPOSTTypeMultipart;
	return call;
}

- (void)cancel
{
	isCancelled = YES;
}

- (id) init
{
	self = [super init];
	if (self != nil)
	{
		self.HTTPMethod = @"POST";
	}
	return self;
}

- (id)copyWithZone:(NSZone *)zone
{
    CSAPICall *theCopy = [[self class] new];
    theCopy.url = self.url;
    theCopy.callArgs = self.callArgs;
    theCopy.POSTType = self.POSTType;
    theCopy.HTTPMethod = self.HTTPMethod;
    theCopy.headerFields = self.headerFields;
    theCopy.enableDebug = self.enableDebug;
    theCopy.block = self.block;
    return theCopy;
}


- (void)runAsynchronously
{	
	dispatch_async([CSAPICall APIQueue], ^{
		[self runSynchronously];
	});
}

- (void)runSynchronously
{
	if (isCancelled) return;
	
	NSDate *startDate = [NSDate date];
	
	CSAPICallStatus s;
	NSURLResponse *urlresponse = nil;
	NSError *err = nil;
	
	NSString *theURL = self.url;
		
	if ([self.HTTPMethod isEqualToString:@"GET"])
	{
		NSDictionary *getArgs = self.callArgs;
		NSMutableArray *urlArgs = [NSMutableArray array];
		
		for (NSString *argKey in getArgs)
		{
			NSObject *theArg = [getArgs objectForKey:argKey];
			
			if ([theArg isKindOfClass:[NSString class]])
			{
				theArg = [(NSString *)theArg stringByAddingPercentEscapesUsingEncoding:NSUTF8StringEncoding];
			}
			
			[urlArgs addObject:[NSString stringWithFormat:@"%@=%@", argKey, theArg]];
		}
		
		theURL = [NSString stringWithFormat:@"%@?%@", theURL, [urlArgs componentsJoinedByString:@"&"]];
	}
	
	NSMutableURLRequest *req = [NSMutableURLRequest requestWithURL:[NSURL URLWithString:theURL]
													   cachePolicy:NSURLRequestReloadIgnoringLocalCacheData
												   timeoutInterval:CSAPICallTimeout];
	[req setHTTPMethod:self.HTTPMethod];
	if (isCancelled) return;
	
	for (NSString *key in self.headerFields)
	{
		[req addValue:[headerFields objectForKey:key] forHTTPHeaderField:key];
	}		
	
	if ([self.HTTPMethod isEqualToString:@"POST"])
	{
		NSDictionary *postArgs = self.callArgs;
		if ([postArgs count])
		{
			switch (self.POSTType)
			{
				case CSPOSTTypeMultipart:
				{
					NSMutableData *postBody = [NSMutableData data];
					[postBody appendData:[[NSString stringWithFormat:@"--%@\r\n", CSStringBoundary] dataUsingEncoding:NSUTF8StringEncoding]];
					
					for (NSString *key in postArgs)
					{
						[postBody appendValue:[postArgs objectForKey:key] forField:key];
					}
					
					NSString *contentType = [NSString stringWithFormat:@"multipart/form-data; boundary=%@",CSStringBoundary];
					[req addValue:contentType forHTTPHeaderField: @"Content-Type"];
					[req setHTTPBody:postBody];
					break;
				}
					
				case CSPOSTTypeFormURLEncoded:
				{
					NSMutableArray *urlArgs = [NSMutableArray array];
					
					for (NSString *argKey in postArgs)
					{
						[urlArgs addObject:[NSString stringWithFormat:@"%@=%@", argKey, [postArgs objectForKey:argKey]]];
					}
					
					NSString *body = [urlArgs componentsJoinedByString:@"&"];
					
					[req setHTTPBody:[body dataUsingEncoding:NSUTF8StringEncoding]];
				}
			}
		}		
	}			
	
	if (isCancelled) return;
	self.request = req;
	
	NSDate *preQuery = [NSDate date];
	
	if (isCancelled) return;
	self.responseData = [NSURLConnection sendSynchronousRequest:self.request returningResponse:&urlresponse error:&err];	
	if (isCancelled) return;
	
	NSDate *postQuery = [NSDate date];
	self.queryTime = [postQuery timeIntervalSinceDate:preQuery];
	
	self.responseString = [[[NSString alloc] initWithData:self.responseData encoding:NSUTF8StringEncoding] stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]];
	
	if (err)
	{
		s = CSAPIConnectionFailed;
	}
	else
	{
		self.responseDictionary = [NSJSONSerialization JSONObjectWithData:self.responseData options:0 error:&err];
		
		if (err)
		{
			s = CSAPIMalformedResponse;
			NSLog(@"Malformed response: %@ [%@]", err, self.responseString);
		}
		else if (self.expectedOutputFormat == CSOutputFormatJSONBasil)
		{
			NSString *stat = [self.responseDictionary objectForKey:CSStatusKey];
			s = ([stat isEqualToString:CSPassValue] ? CSAPISucceeded : CSAPIFailed);
		}		
		else
		{			
			s = CSAPISucceeded;
		}
	}
	
	self.responseError = err;
	if (isCancelled) return;
	
	if (self.enableDebug)
	{
		//		NSLog (@"URL Response: %@", urlresponse);
		//		NSLog (@"Status: %d", s);
		//		NSLog (@"Result as data: %lu bytes", (unsigned long)[self.responseData length]);
		NSLog (@"Result as string: \"%@\"", self.responseString);
	}
	
	self.status = s;
	
	NSDate *endDate = [NSDate date];
	
	self.runTime = [endDate timeIntervalSinceDate:startDate];
	
	//	if (enableDebug)
	//	{
	//		NSLog(@"API Call run time: %.1f | Time in ObjC-land: %.1f%%", self.runTime, 100.0*(1.0-self.queryTime/self.runTime));
	//	}
	if (isCancelled) return;
	
	dispatch_async(dispatch_get_main_queue(), ^{
        if (self.block)
		{
			if (isCancelled) return;
			self.block(self, self.responseDictionary, self.responseError);
		}
	});

	self.isCompleted = (self.status == CSAPISucceeded);
}

//- (BOOL)isEqual:(id)object
//{
//	if (![object isKindOfClass:[self class]]) return NO;
//	
//	CSAPICall *otherCall = (CSAPICall *)object;
//	return [self.rawArgs isEqualToDictionary:otherCall.rawArgs] && [self.service isEqualToString:otherCall.service];
//}

- (CSOutputFormat)expectedOutputFormat
{
	return CSOutputFormatJSONBasil;
}

@end
