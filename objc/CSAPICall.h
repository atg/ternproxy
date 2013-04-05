//
//  CSAPICall.h
//  CSKit
//
//  Created by Nicholas Penree on 9/25/08.
//  Copyright 2008 Conceited Software. All rights reserved.
//

typedef enum {
  CSAPINew,
	CSAPIConnectionFailed,
	CSAPIMalformedResponse,
	CSAPIFailed,
	CSAPISucceeded
} CSAPICallStatus;

typedef enum {
	CSOutputFormatJSONBasil,
	CSOutputFormatJSONArray,
	CSOutputFormatJSONDictionary,
	CSOutputFormatPlist,
	CSOutputFormatXML
} CSOutputFormat;

typedef enum {
	CSPOSTTypeMultipart,
	CSPOSTTypeFormURLEncoded
} CSPOSTType;

@class CSAPICall;

typedef void (^CSCallback)(CSAPICall *call, NSDictionary *args, NSError *err);

@interface CSAPICall : NSObject <NSCopying>

@property (nonatomic, copy) CSCallback block;
@property (nonatomic, strong) NSMutableURLRequest *request;
@property (nonatomic, strong) NSString *responseString, *url, *HTTPMethod;
@property (nonatomic, strong) NSData *responseData;
@property (nonatomic, strong) NSDictionary *responseDictionary, *callArgs, *headerFields;
@property (nonatomic, strong) NSArray *responseArray;
@property (nonatomic, strong) NSError *responseError;
@property (nonatomic) CSAPICallStatus status;
@property (nonatomic, readonly) CSOutputFormat expectedOutputFormat;
@property (nonatomic) BOOL enableDebug, isCompleted;
@property (nonatomic) NSTimeInterval runTime, queryTime;
@property (nonatomic) CSPOSTType POSTType;

+ (id)GETCall;
+ (id)POSTCall;
//+ (CSAPICall *)callWithURL:(NSString *)url;
//+ (CSAPICall *)callWithURL:(NSString *)url fields:(NSDictionary *)args;
+ (CSAPICall *)GETCallWithURL:(NSString *)url fields:(NSDictionary *)_args;
+ (CSAPICall *)POSTCallWithURL:(NSString *)url fields:(NSDictionary *)_args;

- (void)runSynchronously;
- (void)runAsynchronously;
- (void)cancel; 

@end
